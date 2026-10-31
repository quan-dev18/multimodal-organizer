import os
import sys
import shutil
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import threading
import winreg

APP_NAME = "MMO Desktop"
DEFAULT_INSTALL_DIR = os.path.expandvars(r"%LOCALAPPDATA%\Programs\MMO_Desktop")

def create_desktop_shortcut(target_exe, shortcut_name="MMO Desktop"):
    try:
        import win32com.client
        shell = win32com.client.Dispatch("WScript.Shell")
        desktop = shell.SpecialFolders("Desktop")
        shortcut_path = os.path.join(desktop, f"{shortcut_name}.lnk")
        shortcut = shell.CreateShortCut(shortcut_path)
        shortcut.Targetpath = target_exe
        shortcut.WorkingDirectory = os.path.dirname(target_exe)
        icon_path = os.path.join(os.path.dirname(target_exe), "_internal", "app_icon.ico")
        if os.path.exists(icon_path):
            shortcut.IconLocation = icon_path
        shortcut.save()
        return True
    except Exception as e:
        print("Shortcut error:", e)
        return False

def register_uninstall(install_dir, target_exe):
    try:
        key_path = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\MMO_Desktop"
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path) as key:
            winreg.SetValueEx(key, "DisplayName", 0, winreg.REG_SZ, "MMO — Multimodal Organizer Desktop")
            winreg.SetValueEx(key, "DisplayIcon", 0, winreg.REG_SZ, target_exe)
            winreg.SetValueEx(key, "InstallLocation", 0, winreg.REG_SZ, install_dir)
            winreg.SetValueEx(key, "Publisher", 0, winreg.REG_SZ, "MMO Team")
            winreg.SetValueEx(key, "DisplayVersion", 0, winreg.REG_SZ, "1.0.0")
    except Exception as e:
        print("Register uninstall error:", e)

class MMOInstallerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title(f"Cài đặt {APP_NAME}")
        self.root.geometry("560x400")
        self.root.resizable(False, False)
        self.root.configure(bg="#09090b")

        self.source_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist", "MMO_Desktop")
        self.target_dir_var = tk.StringVar(value=DEFAULT_INSTALL_DIR)
        self.create_desktop_var = tk.BooleanVar(value=True)

        self.setup_ui()

    def setup_ui(self):
        # Header banner
        header = tk.Frame(self.root, bg="#121215", padx=24, pady=18)
        header.pack(fill="x")

        title = tk.Label(header, text="Cài đặt MMO Desktop", font=("Segoe UI", 14, "bold"), fg="#f8fafc", bg="#121215")
        title.pack(anchor="w")

        subtitle = tk.Label(header, text="Phần mềm tổ chức tệp tin thông minh & Phân tầng lưu trữ AI", font=("Segoe UI", 9), fg="#94a3b8", bg="#121215")
        subtitle.pack(anchor="w", pady=(2, 0))

        # Main Body
        body = tk.Frame(self.root, bg="#09090b", padx=28, pady=24)
        body.pack(fill="both", expand=True)

        lbl = tk.Label(body, text="Chọn thư mục cài đặt trên máy tính của bạn:", font=("Segoe UI", 10, "bold"), fg="#e2e8f0", bg="#09090b")
        lbl.pack(anchor="w", pady=(0, 8))

        # Path input + Browse button
        path_frame = tk.Frame(body, bg="#09090b")
        path_frame.pack(fill="x", pady=(0, 16))

        txt_path = tk.Entry(path_frame, textvariable=self.target_dir_var, font=("Consolas", 10), bg="#18181b", fg="#f1f5f9", insertbackground="#ffffff", relief="flat", highlightthickness=1, highlightcolor="#6366f1", highlightbackground="#27272a")
        txt_path.pack(side="left", fill="x", expand=True, ipady=6, padx=(0, 8))

        btn_browse = tk.Button(path_frame, text="Duyệt...", font=("Segoe UI", 9), bg="#27272a", fg="#f8fafc", activebackground="#3f3f46", activeforeground="#ffffff", relief="flat", padx=12, command=self.browse_folder)
        btn_browse.pack(side="right")

        chk_shortcut = tk.Checkbutton(body, text="Tạo biểu tượng lối tắt trên Màn hình chính (Desktop Shortcut)", variable=self.create_desktop_var, font=("Segoe UI", 9), bg="#09090b", fg="#cbd5e1", selectcolor="#18181b", activebackground="#09090b", activeforeground="#ffffff")
        chk_shortcut.pack(anchor="w", pady=(0, 20))

        # Progress bar
        self.pbar = ttk.Progressbar(body, orient="horizontal", mode="determinate")
        self.pbar.pack(fill="x", pady=(0, 8))

        self.status_lbl = tk.Label(body, text="Sẵn sàng cài đặt", font=("Segoe UI", 9), fg="#64748b", bg="#09090b")
        self.status_lbl.pack(anchor="w")

        # Bottom buttons
        footer = tk.Frame(self.root, bg="#121215", padx=24, pady=14)
        footer.pack(fill="x", side="bottom")

        self.btn_install = tk.Button(footer, text="Cài đặt ngay", font=("Segoe UI", 10, "bold"), bg="#4f46e5", fg="#ffffff", activebackground="#4338ca", activeforeground="#ffffff", relief="flat", padx=20, pady=4, command=self.start_install)
        self.btn_install.pack(side="right")

        btn_cancel = tk.Button(footer, text="Hủy", font=("Segoe UI", 9), bg="#18181b", fg="#94a3b8", relief="flat", padx=14, pady=4, command=self.root.quit)
        btn_cancel.pack(side="right", padx=(0, 10))

    def browse_folder(self):
        folder = filedialog.askdirectory(initialdir=self.target_dir_var.get(), title="Chọn thư mục cài đặt MMO Desktop")
        if folder:
            self.target_dir_var.set(os.path.normpath(folder))

    def start_install(self):
        self.btn_install.config(state="disabled")
        threading.Thread(target=self.run_copy_process, daemon=True).start()

    def run_copy_process(self):
        target = self.target_dir_var.get().strip()
        if not target:
            messagebox.showerror("Lỗi", "Vui lòng chọn thư mục cài đặt hợp lệ!")
            self.btn_install.config(state="normal")
            return

        source = self.source_dir
        if not os.path.exists(source):
            messagebox.showerror("Lỗi", f"Không tìm thấy thư mục nguồn đã build tại:\n{source}\nHãy chạy package_app.bat trước!")
            self.btn_install.config(state="normal")
            return

        try:
            self.status_lbl.config(text="Đang tạo thư mục đích...", fg="#818cf8")
            os.makedirs(target, exist_ok=True)

            # Count files
            all_files = []
            for root, dirs, files in os.walk(source):
                for f in files:
                    all_files.append(os.path.join(root, f))

            total = len(all_files)
            if total == 0:
                total = 1

            for idx, src_file in enumerate(all_files):
                rel = os.path.relpath(src_file, source)
                dest_file = os.path.join(target, rel)
                os.makedirs(os.path.dirname(dest_file), exist_ok=True)
                shutil.copy2(src_file, dest_file)

                pct = int(((idx + 1) / total) * 100)
                self.pbar["value"] = pct
                self.status_lbl.config(text=f"Đang sao chép ({pct}%): {os.path.basename(src_file)}")
                self.root.update_idletasks()

            target_exe = os.path.join(target, "MMO_Desktop.exe")

            # Create Desktop Shortcut
            if self.create_desktop_var.get():
                self.status_lbl.config(text="Đang tạo biểu tượng Desktop Shortcut...")
                create_desktop_shortcut(target_exe)

            # Register Uninstall entry
            register_uninstall(target, target_exe)

            self.status_lbl.config(text="Cài đặt hoàn tất 100%!", fg="#34d399")
            self.pbar["value"] = 100

            ans = messagebox.askyesno("Thành công", f"MMO Desktop đã được cài đặt thành công tại:\n{target}\n\nBạn có muốn mở ứng dụng ngay bây giờ không?")
            if ans:
                import subprocess
                subprocess.Popen([target_exe], cwd=target)
            self.root.quit()

        except Exception as e:
            messagebox.showerror("Lỗi Cài Đặt", f"Đã xảy ra lỗi trong quá trình cài đặt:\n{str(e)}")
            self.status_lbl.config(text=f"Lỗi: {e}", fg="#f87171")
            self.btn_install.config(state="normal")

if __name__ == "__main__":
    root = tk.Tk()
    app = MMOInstallerGUI(root)
    root.mainloop()
