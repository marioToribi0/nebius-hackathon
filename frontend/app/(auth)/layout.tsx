export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[#050C18] hex-grid scan-line overflow-hidden">
      {/* Gradient orbs */}
      <div className="orb-cyan -top-32 -left-32" />
      <div className="orb-violet -bottom-32 -right-32" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}
