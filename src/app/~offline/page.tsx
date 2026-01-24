export default function OfflinePage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">You&apos;re offline</h1>
        <p className="text-muted-foreground mt-2">
          Please check your internet connection and try again.
        </p>
      </div>
    </div>
  );
}
