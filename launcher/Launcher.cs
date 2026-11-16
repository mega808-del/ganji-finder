// 사주 역산 — 데스크톱 실행 런처
// 더블클릭하면 (필요할 때) 앱을 빌드하고, dist 폴더를 http://localhost:4173 에서 서빙한 뒤
// 기본 브라우저를 연다. 창을 닫아도 서버가 계속 떠 있으므로 트레이 아이콘 메뉴로 종료한다.

using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Windows.Forms;

internal static class Launcher
{
    private const int BasePort = 4173;
    private static string root;
    private static string distDir;
    private static TcpListener listener;
    private static int port = BasePort;
    private static NotifyIcon tray;
    private static bool alreadyRunning;
    private static bool openBrowserOnStart;

    [STAThread]
    private static void Main()
    {
        root = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
        distDir = Path.Combine(root, "dist");
        openBrowserOnStart =
            Array.IndexOf(Environment.GetCommandLineArgs(), "--no-browser") < 0;
        Application.EnableVisualStyles();

        try
        {
            if (!EnsureBuilt()) return;

            if (TryUseExistingServer())
            {
                alreadyRunning = true;
                if (openBrowserOnStart) OpenBrowser(Url);
            }
            else
            {
                StartServer();
                if (openBrowserOnStart) OpenBrowser(Url);
            }

            CreateTray();
            Application.Run();
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                ex.Message,
                "사주 역산 — 실행 실패",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
        }
    }

    private static string Url
    {
        get { return "http://localhost:" + port + "/"; }
    }

    // ------------------------------------------------------------------
    // 빌드
    // ------------------------------------------------------------------

    private static bool EnsureBuilt()
    {
        string distIndex = Path.Combine(distDir, "index.html");
        if (!NeedsBuild(distIndex)) return true;

        string logPath = Path.Combine(root, "launcher-build.log");
        try
        {
            var psi = new ProcessStartInfo(
                "cmd.exe",
                "/c npm run build > \"" + logPath + "\" 2>&1"
            );
            psi.WorkingDirectory = root;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;

            using (Process p = Process.Start(psi))
            {
                p.WaitForExit();
                if (p.ExitCode != 0)
                {
                    ShowBuildError(logPath);
                    return false;
                }
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "앱을 빌드하지 못했습니다.\n\n" + ex.Message,
                "사주 역산 — 실행 실패",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
            return false;
        }

        if (!File.Exists(distIndex))
        {
            ShowBuildError(logPath);
            return false;
        }
        return true;
    }

    private static bool NeedsBuild(string distIndex)
    {
        if (!File.Exists(distIndex)) return true;

        DateTime built = File.GetLastWriteTimeUtc(distIndex);
        string[] files = { "index.html", "package.json", "vite.config.ts", "tailwind.config.js" };
        foreach (string name in files)
        {
            string path = Path.Combine(root, name);
            if (File.Exists(path) && File.GetLastWriteTimeUtc(path) > built) return true;
        }

        string src = Path.Combine(root, "src");
        if (Directory.Exists(src))
        {
            foreach (string path in Directory.GetFiles(src, "*", SearchOption.AllDirectories))
            {
                if (File.GetLastWriteTimeUtc(path) > built) return true;
            }
        }

        string pub = Path.Combine(root, "public");
        if (Directory.Exists(pub))
        {
            foreach (string path in Directory.GetFiles(pub, "*", SearchOption.AllDirectories))
            {
                if (File.GetLastWriteTimeUtc(path) > built) return true;
            }
        }

        return false;
    }

    private static void ShowBuildError(string logPath)
    {
        string tail = "";
        try
        {
            if (File.Exists(logPath))
            {
                string all = File.ReadAllText(logPath, Encoding.UTF8);
                tail = all.Length > 1600 ? all.Substring(all.Length - 1600) : all;
            }
        }
        catch
        {
            // 로그를 못 읽으면 안내 문구만 보여준다.
        }

        MessageBox.Show(
            "앱 빌드에 실패했습니다.\n\n"
                + "Node.js 설치 여부와 프로젝트 폴더의 node_modules 를 확인해 주세요.\n\n"
                + tail,
            "사주 역산 — 빌드 실패",
            MessageBoxButtons.OK,
            MessageBoxIcon.Error
        );
    }

    // ------------------------------------------------------------------
    // 이미 실행 중인지 확인
    // ------------------------------------------------------------------

    private static bool TryUseExistingServer()
    {
        for (int candidate = BasePort; candidate < BasePort + 20; candidate++)
        {
            if (!IsPortOpen(candidate)) continue;
            if (IsOurApp(candidate))
            {
                port = candidate;
                return true;
            }
        }
        return false;
    }

    private static bool IsPortOpen(int candidate)
    {
        try
        {
            using (var client = new TcpClient())
            {
                IAsyncResult ar = client.BeginConnect(IPAddress.Loopback, candidate, null, null);
                if (!ar.AsyncWaitHandle.WaitOne(250)) return false;
                client.EndConnect(ar);
                return true;
            }
        }
        catch
        {
            return false;
        }
    }

    private static bool IsOurApp(int candidate)
    {
        try
        {
            var request = (HttpWebRequest)WebRequest.Create("http://localhost:" + candidate + "/manifest.json");
            request.Timeout = 800;
            request.ReadWriteTimeout = 800;
            using (var response = (HttpWebResponse)request.GetResponse())
            using (var reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8))
            {
                if (response.StatusCode != HttpStatusCode.OK) return false;
                string body = reader.ReadToEnd();
                return body.Contains("icon-192.png") || body.Contains("saju");
            }
        }
        catch
        {
            return false;
        }
    }

    // ------------------------------------------------------------------
    // 정적 서버 (dist 폴더)
    // ------------------------------------------------------------------

    private static void StartServer()
    {
        for (int candidate = BasePort; candidate < BasePort + 20; candidate++)
        {
            try
            {
                var probe = new TcpListener(IPAddress.Loopback, candidate);
                probe.Start();
                listener = probe;
                port = candidate;
                break;
            }
            catch (SocketException)
            {
                // 사용 중인 포트는 건너뛴다.
            }
        }

        if (listener == null) throw new Exception("사용 가능한 포트를 찾지 못했습니다.");

        var thread = new Thread(AcceptLoop);
        thread.IsBackground = true;
        thread.Start();
    }

    private static void AcceptLoop()
    {
        while (true)
        {
            TcpClient client;
            try
            {
                client = listener.AcceptTcpClient();
            }
            catch
            {
                return; // 리스너 종료(앱 종료)
            }

            ThreadPool.QueueUserWorkItem(delegate { Handle(client); });
        }
    }

    private static void Handle(TcpClient client)
    {
        try
        {
            using (client)
            {
                client.ReceiveTimeout = 5000;
                NetworkStream stream = client.GetStream();

                string head = ReadHead(stream);
                if (head == null) return;

                string[] lines = head.Split(new[] { "\r\n" }, StringSplitOptions.None);
                string[] requestLine = lines[0].Split(' ');
                if (requestLine.Length < 2) return;

                string method = requestLine[0].ToUpperInvariant();
                if (method != "GET" && method != "HEAD")
                {
                    WriteStatus(stream, "405 Method Not Allowed");
                    return;
                }

                string target = requestLine[1];
                int query = target.IndexOf('?');
                if (query >= 0) target = target.Substring(0, query);

                try
                {
                    target = Uri.UnescapeDataString(target);
                }
                catch
                {
                    // 잘못된 인코딩은 그대로 사용
                }

                if (target == "/" || target.Length == 0) target = "/index.html";

                string file = ResolveFile(target);
                if (file == null)
                {
                    WriteStatus(stream, "404 Not Found");
                    return;
                }

                byte[] body = File.ReadAllBytes(file);
                string headers =
                    "HTTP/1.1 200 OK\r\n"
                    + "Content-Type: " + ContentType(file) + "\r\n"
                    + "Content-Length: " + body.Length + "\r\n"
                    + "Cache-Control: no-cache\r\n"
                    + "Connection: close\r\n\r\n";
                byte[] headBytes = Encoding.ASCII.GetBytes(headers);
                stream.Write(headBytes, 0, headBytes.Length);
                if (method == "GET") stream.Write(body, 0, body.Length);
                stream.Flush();
            }
        }
        catch
        {
            // 연결 단위 오류는 무시하고 계속 서빙한다.
        }
    }

    private static string ReadHead(NetworkStream stream)
    {
        var buffer = new byte[8192];
        var text = new StringBuilder();
        while (text.Length < 8192)
        {
            int read = stream.Read(buffer, 0, buffer.Length);
            if (read <= 0) break;
            text.Append(Encoding.ASCII.GetString(buffer, 0, read));
            if (text.ToString().Contains("\r\n\r\n")) break;
        }
        if (text.Length == 0) return null;
        return text.ToString();
    }

    private static string ResolveFile(string target)
    {
        string relative = target.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        string candidate = Path.GetFullPath(Path.Combine(distDir, relative));
        string baseDir = Path.GetFullPath(distDir);

        if (candidate.StartsWith(baseDir, StringComparison.OrdinalIgnoreCase) && File.Exists(candidate))
            return candidate;

        // SPA fallback
        string fallback = Path.Combine(distDir, "index.html");
        return File.Exists(fallback) ? fallback : null;
    }

    private static string ContentType(string file)
    {
        string ext = Path.GetExtension(file).ToLowerInvariant();
        switch (ext)
        {
            case ".html": return "text/html; charset=utf-8";
            case ".js":
            case ".mjs": return "text/javascript; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".json":
            case ".webmanifest": return "application/json; charset=utf-8";
            case ".svg": return "image/svg+xml";
            case ".png": return "image/png";
            case ".jpg":
            case ".jpeg": return "image/jpeg";
            case ".webp": return "image/webp";
            case ".ico": return "image/x-icon";
            case ".woff2": return "font/woff2";
            case ".woff": return "font/woff";
            case ".txt": return "text/plain; charset=utf-8";
            default: return "application/octet-stream";
        }
    }

    private static void WriteStatus(NetworkStream stream, string status)
    {
        byte[] bytes = Encoding.ASCII.GetBytes(
            "HTTP/1.1 " + status + "\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
        );
        stream.Write(bytes, 0, bytes.Length);
        stream.Flush();
    }

    // ------------------------------------------------------------------
    // 트레이 아이콘 / 브라우저
    // ------------------------------------------------------------------

    private static void CreateTray()
    {
        tray = new NotifyIcon();
        tray.Icon = LoadIcon();
        tray.Text = "사주 역산";
        tray.Visible = true;

        var menu = new ContextMenuStrip();
        menu.Items.Add("앱 열기", null, delegate { OpenBrowser(Url); });
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("종료", null, delegate { Shutdown(); });
        tray.ContextMenuStrip = menu;
        tray.DoubleClick += delegate { OpenBrowser(Url); };

        tray.ShowBalloonTip(
            3000,
            "사주 역산",
            alreadyRunning ? "이미 실행 중인 앱을 브라우저로 열었습니다." : "브라우저에서 앱을 열었습니다. 종료는 트레이 아이콘 우클릭.",
            ToolTipIcon.Info
        );
    }

    private static Icon LoadIcon()
    {
        string[] candidates =
        {
            Path.Combine(distDir, "icons", "icon-192.png"),
            Path.Combine(root, "public", "icons", "icon-192.png")
        };
        foreach (string path in candidates)
        {
            try
            {
                if (!File.Exists(path)) continue;
                using (var bitmap = new Bitmap(path))
                {
                    IntPtr handle = bitmap.GetHicon();
                    using (var temp = Icon.FromHandle(handle))
                    {
                        return (Icon)temp.Clone();
                    }
                }
            }
            catch
            {
                // 아이콘을 못 읽으면 기본 아이콘 사용
            }
        }
        return SystemIcons.Application;
    }

    private static void OpenBrowser(string url)
    {
        try
        {
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "브라우저를 열지 못했습니다.\n다음 주소를 직접 열어 주세요:\n" + url + "\n\n" + ex.Message,
                "사주 역산",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning
            );
        }
    }

    private static void Shutdown()
    {
        try
        {
            if (tray != null)
            {
                tray.Visible = false;
                tray.Dispose();
            }
            if (listener != null) listener.Stop();
        }
        catch
        {
            // 종료 중 오류는 무시
        }
        Application.Exit();
    }
}
