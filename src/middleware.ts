export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/entities/:path*",
    "/content/:path*",
    "/calendar/:path*",
    "/campaigns/:path*",
    "/knowledge/:path*",
    "/assets/:path*",
    "/inbox/:path*",
    "/analytics/:path*",
    "/prompts/:path*",
    "/settings/:path*",
  ],
};
