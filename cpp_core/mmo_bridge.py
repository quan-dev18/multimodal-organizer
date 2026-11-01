import os
import sys
import ctypes
import json
from typing import Dict, Any, Optional

LIB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "libmmo_core.so")

_cpp_lib = None
if os.path.exists(LIB_PATH):
    try:
        _cpp_lib = ctypes.CDLL(LIB_PATH)
        _cpp_lib.mmo_scan_directory.argtypes = [ctypes.c_char_p, ctypes.c_bool]
        _cpp_lib.mmo_scan_directory.restype = ctypes.c_char_p

        _cpp_lib.mmo_safe_transfer.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_bool]
        _cpp_lib.mmo_safe_transfer.restype = ctypes.c_bool
    except Exception as e:
        print(f"[C++ Core] Failed to load {LIB_PATH}: {e}", file=sys.stderr)
        _cpp_lib = None

def has_cpp_core() -> bool:
    return _cpp_lib is not None

def cpp_scan_directory(dir_path: str, include_hidden: bool = True) -> Optional[Dict[str, Any]]:
    if not _cpp_lib:
        return None
    try:
        raw = _cpp_lib.mmo_scan_directory(dir_path.encode("utf-8"), include_hidden)
        if raw:
            return json.loads(raw.decode("utf-8"))
    except Exception as e:
        print(f"[C++ Core Scanner Error] {e}", file=sys.stderr)
    return None

def cpp_safe_transfer(src: str, dst: str, is_copy: bool = False) -> bool:
    if not _cpp_lib:
        return False
    try:
        return bool(_cpp_lib.mmo_safe_transfer(src.encode("utf-8"), dst.encode("utf-8"), is_copy))
    except Exception:
        return False
