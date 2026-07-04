import Link from "next/link";

export function Logo({ collapsed = true }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center justify-center gap-2 group">
      {/* Mark */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <rect width="28" height="28" rx="7" className="fill-foreground" />
        {/* stylised C arc */}
        <path
          d="M19 9.5C17.6 8.5 16 8 14 8C9.6 8 7 11 7 14C7 17 9.6 20 14 20C16 20 17.6 19.5 19 18.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          className="dark:stroke-black"
        />
        {/* dot accent */}
        <circle cx="20.5" cy="14" r="1.5" className="fill-white dark:fill-black" />
      </svg>

      {!collapsed && (
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Content<span className="opacity-40">·ment</span>
        </span>
      )}
    </Link>
  );
}
