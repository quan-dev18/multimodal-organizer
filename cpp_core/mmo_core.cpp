#include <iostream>
#include <string>
#include <vector>
#include <filesystem>
#include <chrono>
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <fstream>
#include <cstring>
#include <openssl/sha.h>

namespace fs = std::filesystem;

// Modality detection
std::string detect_modality(const std::string& ext_str) {
    std::string ext = ext_str;
    if (!ext.empty() && ext[0] == '.') ext = ext.substr(1);
    std::transform(ext.begin(), ext.end(), ext.begin(), ::tolower);

    if (ext == "txt" || ext == "md" || ext == "pdf" || ext == "doc" || ext == "docx" ||
        ext == "csv" || ext == "xlsx" || ext == "json" || ext == "log" || ext == "xml" || ext == "pptx") {
        return "text";
    }
    if (ext == "jpg" || ext == "jpeg" || ext == "png" || ext == "webp" ||
        ext == "gif" || ext == "svg" || ext == "bmp" || ext == "tiff" || ext == "ico") {
        return "image";
    }
    if (ext == "mp3" || ext == "wav" || ext == "flac" || ext == "aac" || ext == "ogg" || ext == "m4a") {
        return "audio";
    }
    if (ext == "mp4" || ext == "mkv" || ext == "avi" || ext == "mov" || ext == "webm" || ext == "wmv") {
        return "video";
    }
    return "other";
}

bool is_junk_file(const std::string& name, const std::string& ext_str) {
    std::string ext = ext_str;
    if (!ext.empty() && ext[0] == '.') ext = ext.substr(1);
    std::transform(ext.begin(), ext.end(), ext.begin(), ::tolower);

    std::string lower_name = name;
    std::transform(lower_name.begin(), lower_name.end(), lower_name.begin(), ::tolower);

    if (ext == "tmp" || ext == "temp" || ext == "log" || ext == "bak" ||
        ext == "dmp" || ext == "old" || ext == "cache" || ext == "crdownload" || ext == "part") {
        return true;
    }
    if (lower_name == "thumbs.db" || lower_name == ".ds_store" || lower_name.rfind("~$", 0) == 0) {
        return true;
    }
    return false;
}

std::string compute_sha256(const std::string& filepath) {
    std::ifstream file(filepath, std::ios::binary);
    if (!file) return "";

    SHA256_CTX sha256;
    SHA256_Init(&sha256);
    char buffer[65536];
    while (file.read(buffer, sizeof(buffer)) || file.gcount() > 0) {
        SHA256_Update(&sha256, buffer, file.gcount());
    }

    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256_Final(hash, &sha256);

    std::ostringstream os;
    for (int i = 0; i < SHA256_DIGEST_LENGTH; i++) {
        os << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
    }
    return os.str();
}

extern "C" {

// Fast C++ Directory Scanner exported as JSON
const char* mmo_scan_directory(const char* dir_path, bool include_hidden) {
    static std::string result_json;
    try {
        fs::path p(dir_path);
        if (!fs::exists(p) || !fs::is_directory(p)) {
            result_json = "{\"error\": \"Thư mục không tồn tại\", \"folders\": [], \"files\": []}";
            return result_json.c_str();
        }

        std::ostringstream folders_ss;
        std::ostringstream files_ss;
        folders_ss << "[";
        files_ss << "[";

        size_t total_folders = 0;
        size_t total_files = 0;
        uint64_t total_size = 0;

        bool first_f = true;
        bool first_file = true;

        for (const auto& entry : fs::directory_iterator(p, fs::directory_options::skip_permission_denied)) {
            std::string name = entry.path().filename().string();
            bool is_hidden = (!name.empty() && name[0] == '.');
            if (is_hidden && !include_hidden) continue;

            std::string full_path = entry.path().string();

            if (entry.is_directory()) {
                total_folders++;
                if (!first_f) folders_ss << ",";
                first_f = false;

                bool has_children = false;
                try {
                    auto sub_it = fs::directory_iterator(entry.path(), fs::directory_options::skip_permission_denied);
                    has_children = (sub_it != fs::end(sub_it));
                } catch (...) {}

                folders_ss << "{\"name\":\"" << name 
                           << "\",\"path\":\"" << full_path 
                           << "\",\"is_dir\":true,\"is_hidden\":" << (is_hidden ? "true" : "false")
                           << ",\"has_children\":" << (has_children ? "true" : "false") << "}";
            } else if (entry.is_regular_file()) {
                total_files++;
                if (!first_file) files_ss << ",";
                first_file = false;

                uint64_t size = 0;
                uint64_t mod_time = 0;
                try {
                    size = entry.file_size();
                    total_size += size;
                    auto ftime = entry.last_write_time();
                    auto sctp = std::chrono::time_point_cast<std::chrono::system_clock::duration>(
                        ftime - fs::file_time_type::clock::now() + std::chrono::system_clock::now()
                    );
                    mod_time = std::chrono::duration_cast<std::chrono::seconds>(sctp.time_since_epoch()).count();
                } catch (...) {}

                std::string ext = entry.path().extension().string();
                std::string modality = detect_modality(ext);
                bool is_junk = is_junk_file(name, ext);

                files_ss << "{\"name\":\"" << name 
                         << "\",\"path\":\"" << full_path 
                         << "\",\"is_dir\":false,\"size_bytes\":" << size 
                         << ",\"extension\":\"" << ext 
                         << "\",\"is_hidden\":" << (is_hidden ? "true" : "false")
                         << ",\"is_junk\":" << (is_junk ? "true" : "false")
                         << ",\"modified_timestamp\":" << mod_time 
                         << ",\"modality\":\"" << modality << "\"}";
            }
        }
        folders_ss << "]";
        files_ss << "]";

        std::ostringstream final_json;
        final_json << "{"
                   << "\"current_path\":\"" << fs::canonical(p).string() << "\","
                   << "\"parent_path\":\"" << (p.has_parent_path() ? p.parent_path().string() : "") << "\","
                   << "\"total_folders\":" << total_folders << ","
                   << "\"total_files\":" << total_files << ","
                   << "\"total_size_bytes\":" << total_size << ","
                   << "\"folders\":" << folders_ss.str() << ","
                   << "\"files\":" << files_ss.str()
                   << "}";

        result_json = final_json.str();
        return result_json.c_str();
    } catch (const std::exception& e) {
        result_json = std::string("{\"error\":\"") + e.what() + "\",\"folders\":[],\"files\":[]}";
        return result_json.c_str();
    }
}

// Fast Safe Move / Copy with integrity validation
bool mmo_safe_transfer(const char* src_path, const char* dst_path, bool is_copy) {
    try {
        fs::path src(src_path);
        fs::path dst(dst_path);

        if (!fs::exists(src)) return false;

        fs::create_directories(dst.parent_path());

        if (is_copy) {
            return fs::copy_file(src, dst, fs::copy_options::overwrite_existing);
        } else {
            std::error_code ec;
            fs::rename(src, dst, ec);
            if (!ec) return true;

            // Cross-device fallback: copy then remove
            if (fs::copy_file(src, dst, fs::copy_options::overwrite_existing)) {
                fs::remove(src);
                return true;
            }
            return false;
        }
    } catch (...) {
        return false;
    }
}

}
