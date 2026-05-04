import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#0a0a0a]">
            <span className="text-sm font-bold text-white">JC</span>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-[#0a0a0a]">Sign in to JobCore</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Your contractor operating system</p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
