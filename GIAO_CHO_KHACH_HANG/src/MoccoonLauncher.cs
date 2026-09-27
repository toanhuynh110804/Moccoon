using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Text;
using System.Windows.Forms;

namespace MoccoonLauncher
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string configFile = Path.Combine(baseDir, "config.json");
                string serverUrl = "http://localhost:5000";

                // Đọc file config nếu có
                if (File.Exists(configFile))
                {
                    string content = File.ReadAllText(configFile, Encoding.UTF8);
                    int urlIdx = content.IndexOf("\"server_url\"");
                    if (urlIdx != -1)
                    {
                        int colonIdx = content.IndexOf(":", urlIdx);
                        if (colonIdx != -1)
                        {
                            int startQuote = content.IndexOf("\"", colonIdx);
                            if (startQuote != -1)
                            {
                                int endQuote = content.IndexOf("\"", startQuote + 1);
                                if (endQuote != -1)
                                {
                                    serverUrl = content.Substring(startQuote + 1, endQuote - startQuote - 1).Trim();
                                }
                            }
                        }
                    }
                }

                // Nếu là URL localhost, kiểm tra xem máy chủ có đang chạy không
                if (serverUrl.Contains("localhost") || serverUrl.Contains("127.0.0.1"))
                {
                    bool isServerRunning = CheckPort("127.0.0.1", 5000);
                    if (!isServerRunning)
                    {
                        // Thử tìm backend trong các thư mục lân cận
                        string[] candidatePaths = new string[]
                        {
                            Path.Combine(baseDir, "backend", "src", "server.js"),
                            Path.Combine(baseDir, "..", "backend", "src", "server.js"),
                            Path.Combine(baseDir, "server.js")
                        };

                        string foundServerScript = null;
                        string workingDir = null;

                        foreach (string p in candidatePaths)
                        {
                            if (File.Exists(p))
                            {
                                foundServerScript = Path.GetFullPath(p);
                                workingDir = Path.GetDirectoryName(Path.GetDirectoryName(foundServerScript));
                                break;
                            }
                        }

                        if (foundServerScript != null && workingDir != null)
                        {
                            // Tìm node.exe portable nếu máy chưa cài Node.js
                            string nodeCommand = "node";
                            string[] nodeCandidates = new string[]
                            {
                                Path.Combine(baseDir, "node_bin", "node.exe"),
                                Path.Combine(baseDir, "..", "node_bin", "node.exe"),
                                Path.Combine(workingDir, "..", "node_bin", "node.exe")
                            };
                            foreach (string nc in nodeCandidates)
                            {
                                if (File.Exists(nc))
                                {
                                    nodeCommand = "\"" + Path.GetFullPath(nc) + "\"";
                                    break;
                                }
                            }

                            // Khởi động server ngầm không hiện console
                            ProcessStartInfo serverPsi = new ProcessStartInfo();
                            serverPsi.FileName = "cmd.exe";
                            serverPsi.Arguments = "/c " + nodeCommand + " \"" + foundServerScript + "\"";
                            serverPsi.WorkingDirectory = workingDir;
                            serverPsi.WindowStyle = ProcessWindowStyle.Hidden;
                            serverPsi.CreateNoWindow = true;
                            serverPsi.UseShellExecute = false;
                            Process.Start(serverPsi);

                            // Đợi tối đa 4 giây cho server lên
                            for (int i = 0; i < 8; i++)
                            {
                                System.Threading.Thread.Sleep(500);
                                if (CheckPort("127.0.0.1", 5000)) break;
                            }
                        }
                    }
                }

                // Khởi chạy cửa sổ ứng dụng Desktop (App Mode)
                LaunchDesktopApp(serverUrl);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Không thể khởi động Moccoon: " + ex.Message, "Lỗi Moccoon", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        static bool CheckPort(string host, int port)
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    var result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(400);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        static void LaunchDesktopApp(string url)
        {
            string appDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Moccoon_Desktop_App");
            string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (!File.Exists(edgePath))
            {
                edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            }

            string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            if (!File.Exists(chromePath))
            {
                chromePath = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";
            }

            string browserPath = null;
            if (File.Exists(edgePath)) browserPath = edgePath;
            else if (File.Exists(chromePath)) browserPath = chromePath;

            if (browserPath != null)
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = browserPath;
                psi.Arguments = "--app=\"" + url + "\" --window-size=1280,820 --user-data-dir=\"" + appDataFolder + "\"";
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            else
            {
                // Trình duyệt mặc định
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
        }
    }
}
