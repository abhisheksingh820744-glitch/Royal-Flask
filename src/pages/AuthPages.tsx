import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  updateProfile,
  type ConfirmationResult,
} from 'firebase/auth';
import { ArrowRight, CheckCircle2, KeyRound, Mail, Phone, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { auth } from '../lib/firebase';
import { SeoHead } from '../components/SeoHead';

export function SplashPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-16 bg-[#0B1D3A] text-white text-center">
      <SeoHead title="Welcome – ROYAL FLASK" description="ROYAL FLASK luxury Home & Kitchen India." />
      <p className="text-xs uppercase tracking-[0.25em] text-blue-300">Est. India · Home &amp; Kitchen</p>
      <h1 className="mt-4 font-display text-5xl sm:text-6xl font-bold tracking-tight">ROYAL FLASK</h1>
      <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-md leading-relaxed">
        Precision vacuum flasks, cast iron cookware, and architectural dining essentials crafted for Indian homes.
      </p>
      <div className="mt-8 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/onboarding')}
          className="px-6 py-3 text-sm font-semibold bg-[#2449B5] hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          Begin Experience
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-6 py-3 text-sm font-semibold border border-white/25 hover:bg-white/10 text-white rounded-lg transition-colors"
        >
          Enter Store
        </button>
      </div>
    </main>
  );
}

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const slides = [
    {
      title: '24-Hour Thermal Precision',
      desc: 'Copper-lined 304 surgical-grade stainless steel vacuum flasks engineered for Indian summers and daily commutes.',
    },
    {
      title: '13 Curated Home & Kitchen Departments',
      desc: 'From pre-seasoned cast iron kadais and insulated 3-tier tiffins to borosilicate pantry canisters and tableware.',
    },
    {
      title: 'Pan-India Delivery & WhatsApp Concierge',
      desc: 'Track orders in real time, pay via UPI, Cards, Net Banking, or COD, and message our team directly on WhatsApp.',
    },
  ];

  const current = slides[step];

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-14">
      <SeoHead title="Onboarding – ROYAL FLASK" description="Explore what makes ROYAL FLASK India's premier Home & Kitchen store." />
      <div className="max-w-xl w-full bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10">
        <p className="text-xs font-mono-tabular font-medium text-[#2449B5] dark:text-blue-400">
          0{step + 1} / 0{slides.length}
        </p>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-[#0B1D3A] dark:text-white">
          {current.title}
        </h1>
        <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          {current.desc}
        </p>

        <div className="mt-8 flex items-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setStep(idx)}
              aria-label={`Step ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                idx === step ? 'w-10 bg-[#2449B5]' : 'w-4 bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            Skip to Store
          </button>

          {step < slides.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#0B1D3A] dark:bg-[#2449B5] rounded-lg"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#2449B5] rounded-lg"
            >
              <span>Start Shopping</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export function LoginPage() {
  const { signInWithGoogle, user, notifyToast } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) navigate('/profile');
  }, [user, navigate]);

  const handleGoogle = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google Sign-In could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      notifyToast('Signed in successfully.', 'success');
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('operation-not-allowed')) {
        setErrorMsg(
          'Email/Password sign-in is not yet enabled in the Firebase Console (Authentication → Sign-in method). Please use Google Sign-In or enable Email/Password in Firebase Console.',
        );
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-14">
      <SeoHead title="Sign In – ROYAL FLASK" description="Sign in to your ROYAL FLASK customer or admin account." />
      <div className="bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
        <h1 className="font-display text-3xl font-bold text-[#0B1D3A] dark:text-white">Sign In</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Access your orders, wishlist, saved Indian addresses, and checkout.
        </p>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="mt-6 w-full py-3 px-4 flex items-center justify-center gap-2.5 text-sm font-semibold text-white bg-[#0B1D3A] hover:bg-[#2449B5] dark:bg-[#2449B5] dark:hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Continue with Google</span>
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          <span>or email credentials</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2449B5]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2449B5]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Sign In with Email
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <Link to="/register" className="font-medium text-[#2449B5] dark:text-blue-400 hover:underline">
            Create an account
          </Link>
          <Link to="/otp" className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300 hover:text-[#2449B5]">
            <Phone className="w-3.5 h-3.5" />
            <span>Mobile OTP Login</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

export function RegisterPage() {
  const { signInWithGoogle, notifyToast } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      await sendEmailVerification(cred.user).catch(() => {});
      notifyToast('Account created. Verification email sent.', 'success');
      navigate('/profile');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('operation-not-allowed')) {
        setErrorMsg(
          'Email/Password registration requires enabling the Email/Password provider in Firebase Console (Authentication → Sign-in method). You can use Google Sign-In immediately below.',
        );
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-14">
      <SeoHead title="Create Account – ROYAL FLASK" description="Register for a ROYAL FLASK India account." />
      <div className="bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
        <h1 className="font-display text-3xl font-bold text-[#0B1D3A] dark:text-white">Create Account</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Join ROYAL FLASK for faster checkout, saved addresses, and order tracking.
        </p>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={async () => {
            await signInWithGoogle();
            navigate('/');
          }}
          className="mt-6 w-full py-3 px-4 text-sm font-semibold text-white bg-[#0B1D3A] hover:bg-[#2449B5] dark:bg-[#2449B5] rounded-lg"
        >
          Sign Up with Google
        </button>

        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aarav Sharma"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911] text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911] text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911] text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {loading ? 'Creating...' : 'Create Email Account'}
          </button>
        </form>

        <p className="mt-5 text-xs text-center text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="text-[#2449B5] dark:text-blue-400 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export function OtpVerificationPage() {
  const { notifyToast } = useStore();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const verifier = new RecaptchaVerifier(auth, 'rf-recaptcha-container', { size: 'invisible' });
      const res = await signInWithPhoneNumber(auth, phone.trim(), verifier);
      setConfirmation(res);
      notifyToast('OTP dispatched to your mobile number.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(
        msg.includes('operation-not-allowed')
          ? 'Phone OTP authentication requires enabling the Phone provider in Firebase Console (Authentication → Sign-in method).'
          : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmation) return;
    setErrorMsg('');
    setLoading(true);
    try {
      await confirmation.confirm(otp.trim());
      notifyToast('Mobile number verified!', 'success');
      navigate('/profile');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-14">
      <SeoHead title="Mobile OTP Verification – ROYAL FLASK" description="Verify your Indian mobile number via OTP." />
      <div className="bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
        <h1 className="font-display text-3xl font-bold text-[#0B1D3A] dark:text-white">Mobile OTP Sign-In</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Enter your +91 Indian mobile number for Firebase SMS verification.
        </p>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {!confirmation ? (
          <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mobile Number (E.164 Format)
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3 py-2.5 text-sm font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911] text-slate-900 dark:text-white"
              />
            </div>
            <div id="rf-recaptcha-container" />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#0B1D3A] dark:bg-[#2449B5] rounded-lg"
            >
              {loading ? 'Sending OTP...' : 'Send Verification OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>OTP sent to {phone}</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                6-Digit OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2.5 text-sm font-mono-tabular tracking-widest rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911] text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#2449B5] rounded-lg"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-center text-slate-500">
          Prefer instant sign-in?{' '}
          <Link to="/login" className="text-[#2449B5] dark:text-blue-400 font-medium hover:underline">
            Return to Google / Email Login
          </Link>
        </p>
      </div>
    </main>
  );
}
