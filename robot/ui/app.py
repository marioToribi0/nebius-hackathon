"""Tkinter UI: mute button + camera feed sub-window."""

import queue
import threading
import tkinter as tk
from tkinter import ttk

import cv2
from PIL import Image, ImageTk
from loguru import logger

from vision.camera import Camera
from vision.qr_scanner import scan_frame


class RobotUI:
    """
    Main Tkinter window.

    Controls:
      - Mute button: toggle AudioListener on/off
      - Status label: shows current agent state
      - Camera button: show/hide live camera feed sub-window
    """

    def __init__(
        self,
        agent_state: dict,
        mute_event: threading.Event,
        camera: Camera,
    ):
        self._state = agent_state
        self._mute_event = mute_event
        self._camera = camera

        self._root = tk.Tk()
        self._root.title("Wayfinder G1")
        self._root.resizable(False, False)
        self._root.configure(bg="#1a1a2e")

        self._camera_window: tk.Toplevel | None = None
        self._camera_label: tk.Label | None = None

        self._build_main_window()
        self._schedule_status_update()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def mainloop(self) -> None:
        self._root.mainloop()

    def set_status(self, text: str) -> None:
        """Thread-safe status update."""
        self._root.after(0, lambda: self._status_var.set(text))

    # ------------------------------------------------------------------
    # Build UI
    # ------------------------------------------------------------------

    def _build_main_window(self) -> None:
        root = self._root
        pad = {"padx": 16, "pady": 8}

        # Title
        title = tk.Label(
            root,
            text="Wayfinder G1",
            font=("Helvetica", 20, "bold"),
            fg="#e2e8f0",
            bg="#1a1a2e",
        )
        title.pack(**pad)

        # Status
        self._status_var = tk.StringVar(value="Initialising...")
        status_label = tk.Label(
            root,
            textvariable=self._status_var,
            font=("Helvetica", 12),
            fg="#94a3b8",
            bg="#1a1a2e",
            width=36,
        )
        status_label.pack(**pad)

        # Mute button
        self._mute_var = tk.StringVar(value="🎤  LIVE")
        self._mute_btn = tk.Button(
            root,
            textvariable=self._mute_var,
            font=("Helvetica", 14, "bold"),
            width=16,
            bg="#16a34a",
            fg="white",
            activebackground="#15803d",
            relief="flat",
            command=self._toggle_mute,
        )
        self._mute_btn.pack(**pad)

        # Camera button
        self._cam_btn = tk.Button(
            root,
            text="📷  Show Camera",
            font=("Helvetica", 11),
            width=16,
            bg="#334155",
            fg="white",
            activebackground="#475569",
            relief="flat",
            command=self._toggle_camera_window,
        )
        self._cam_btn.pack(**pad)

        # Quit
        quit_btn = tk.Button(
            root,
            text="Quit",
            font=("Helvetica", 10),
            width=10,
            bg="#7f1d1d",
            fg="white",
            activebackground="#991b1b",
            relief="flat",
            command=root.destroy,
        )
        quit_btn.pack(pady=(4, 16))

    # ------------------------------------------------------------------
    # Callbacks
    # ------------------------------------------------------------------

    def _toggle_mute(self) -> None:
        if self._mute_event.is_set():
            self._mute_event.clear()
            self._mute_var.set("🎤  LIVE")
            self._mute_btn.config(bg="#16a34a")
            logger.info("UI: mic unmuted")
        else:
            self._mute_event.set()
            self._mute_var.set("🔇  MUTED")
            self._mute_btn.config(bg="#7f1d1d")
            logger.info("UI: mic muted")

    def _toggle_camera_window(self) -> None:
        if self._camera_window and self._camera_window.winfo_exists():
            self._camera_window.destroy()
            self._camera_window = None
            self._cam_btn.config(text="📷  Show Camera")
        else:
            self._open_camera_window()
            self._cam_btn.config(text="📷  Hide Camera")

    def _open_camera_window(self) -> None:
        win = tk.Toplevel(self._root)
        win.title("Camera Feed")
        win.configure(bg="#0f172a")
        self._camera_label = tk.Label(win, bg="#0f172a")
        self._camera_label.pack()

        self._qr_status_var = tk.StringVar(value="")
        qr_label = tk.Label(
            win,
            textvariable=self._qr_status_var,
            font=("Helvetica", 11),
            fg="#4ade80",
            bg="#0f172a",
        )
        qr_label.pack(pady=4)

        self._camera_window = win
        win.protocol("WM_DELETE_WINDOW", self._toggle_camera_window)
        self._update_camera_frame()

    def _update_camera_frame(self) -> None:
        if not (self._camera_window and self._camera_window.winfo_exists()):
            return

        frame = self._camera.get_frame()
        if frame is not None:
            in_qr_mode = self._state.get("qr_mode", False)
            if in_qr_mode:
                value, frame = scan_frame(frame)
                if value:
                    valid = self._state.get("place_key") == value
                    marker = "✓ Valid" if valid else "scanning..."
                    self._qr_status_var.set(f"QR: {value[:30]}  {marker}")
                else:
                    self._qr_status_var.set("Scanning for QR...")
            else:
                self._qr_status_var.set("")

            # Resize for display
            h, w = frame.shape[:2]
            scale = min(640 / w, 480 / h)
            new_w, new_h = int(w * scale), int(h * scale)
            display = cv2.resize(frame, (new_w, new_h))
            rgb = cv2.cvtColor(display, cv2.COLOR_BGR2RGB)
            img = ImageTk.PhotoImage(Image.fromarray(rgb))
            self._camera_label.configure(image=img)
            self._camera_label.image = img  # keep reference

        self._camera_window.after(100, self._update_camera_frame)

    # ------------------------------------------------------------------
    # Status polling
    # ------------------------------------------------------------------

    def _schedule_status_update(self) -> None:
        self._update_status()
        self._root.after(500, self._schedule_status_update)

    def _update_status(self) -> None:
        state = self._state
        if state.get("qr_mode"):
            self._status_var.set("📷  Scanning for QR code...")
        elif state.get("place_name"):
            name = state["place_name"]
            self._status_var.set(f"✅  Context loaded: {name}")
        elif self._mute_event.is_set():
            self._status_var.set("🔇  Muted")
        else:
            self._status_var.set("🎤  Listening...")
