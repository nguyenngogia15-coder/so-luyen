// ====== CHỈ CẦN SỬA FILE NÀY ======
// 1) Dán phần firebaseConfig lấy ở Firebase (Project settings → Your apps → SDK setup and configuration → Config)
// 2) Dán địa chỉ Cloudflare Worker (dạng https://ten-worker.ten-ban.workers.dev)
window.FREE_CONFIG = {
  firebase: {
    apiKey: "DAN_VAO_DAY",
    authDomain: "DAN_VAO_DAY.firebaseapp.com",
    projectId: "DAN_VAO_DAY",
    storageBucket: "DAN_VAO_DAY.appspot.com",
    messagingSenderId: "DAN_VAO_DAY",
    appId: "DAN_VAO_DAY"
  },
  workerUrl: "https://DAN_VAO_DAY.workers.dev"
};
