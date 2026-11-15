function browserName(ua) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/YaBrowser/.test(ua)) return "Яндекс";
  if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "";
}

function deviceName(ua, platform, mobile) {
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return /Mobile/.test(ua) || mobile ? "Телефон Android" : "Планшет Android";
  if (/Windows/.test(ua) || platform === "Windows") return "Windows";
  if (/Mac OS X|Macintosh/.test(ua) || platform === "macOS") return "Mac";
  if (/CrOS/.test(ua) || platform === "Chrome OS") return "Chromebook";
  if (/Linux/.test(ua) || platform === "Linux") return "Linux";
  return "Неизвестное устройство";
}

export function describeDevice(headers) {
  const ua = String(headers.get("user-agent") || "");
  const platform = String(headers.get("sec-ch-ua-platform") || "").replace(/"/g, "");
  const mobile = headers.get("sec-ch-ua-mobile") === "?1";
  const device = deviceName(ua, platform, mobile);
  const browser = browserName(ua);
  const label = browser ? `${device} · ${browser}` : device;
  return {
    device: label.slice(0, 80),
    userAgent: ua.replace(/[\u0000-\u001F]/g, "").trim().slice(0, 400),
  };
}
