import jwt from "jsonwebtoken";

export const getCookieOptions = (req) => {
  const isProduction = process.env.NODE_ENV === "production";
  const forwardedProto = req?.headers?.["x-forwarded-proto"];
  const proto = typeof forwardedProto === "string"
    ? forwardedProto.split(",")[0].trim().toLowerCase()
    : "";
  const isHttps = Boolean(req?.secure || proto === "https");

  const sameSite = process.env.COOKIE_SAME_SITE || "lax";

  let secure;
  if (process.env.COOKIE_SECURE === "true") {
    secure = true;
  } else if (process.env.COOKIE_SECURE === "false") {
    secure = false;
  } else {
    secure = isProduction && isHttps;
  }

  // Browsers reject SameSite=None cookies unless Secure=true
  if (sameSite.toLowerCase() === "none") {
    secure = true;
  }

  return {
    httpOnly: true, // prevent XSS attacks
    sameSite,
    secure,
    path: "/",
  };
};

export const generateToken = (userId, res, req) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    ...getCookieOptions(req),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });

  return token;
};

export const clearTokenCookie = (res, req) => {
  res.clearCookie("jwt", getCookieOptions(req));
};
