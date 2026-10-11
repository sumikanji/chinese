// ===== Cấu hình đăng nhập & đồng bộ Sumi Chinese =====
// Dùng CHUNG dự án Firebase với Sumi English: một tài khoản đăng nhập được cả hai trang.
// Tiến độ tiếng Trung nằm riêng ở users/<uid>/chinese, không đụng dữ liệu tiếng Anh.
// Đặt window.SUMI_FIREBASE = null; nếu muốn tắt đăng nhập (tiến độ chỉ lưu trên trình duyệt).
window.SUMI_FIREBASE = {
  apiKey: "AIzaSyA1A3gyO4Ymh_AU0A35wX2mDWAv4Mp4DIo",
  authDomain: "sumienglish-f4406.firebaseapp.com",
  // Địa chỉ Realtime Database: nếu khi tạo database bạn chọn vùng khác Singapore,
  // hãy chép đúng địa chỉ ở thẻ "データ" của Realtime Database và thay vào dòng dưới.
  databaseURL: "https://sumienglish-f4406-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sumienglish-f4406",
  storageBucket: "sumienglish-f4406.firebasestorage.app",
  messagingSenderId: "710643162033",
  appId: "1:710643162033:web:5d4cba88f1c11dd4e8bb90"
};

// Bật / tắt từng cách đăng nhập
window.SUMI_AUTH_PROVIDERS = { google: true, email: true };
