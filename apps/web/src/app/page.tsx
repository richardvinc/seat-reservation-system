'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ActionButton } from './_components/action-button';
import { JsonPanel } from './_components/json-panel';

type AuthSession = {
  username: string;
};

type SeatStatus = {
  seatId: string;
  status:
    | 'available'
    | 'reserved'
    | 'reserved_by_you'
    | 'paid'
    | 'paid_by_you';
  reservationId: string | null;
  reservedByCurrentUser: boolean;
  paidByCurrentUser: boolean;
  expiresAt: string | null;
};

type SaleStatus = {
  saleId: string;
  status: 'upcoming' | 'active' | 'ended';
  totalStock: number;
  availableSlots: number;
  seats: SeatStatus[];
  startTime: string;
  endTime: string;
};

type BuyResponse = {
  username: string;
  seatId: string;
  status: string;
  message: string;
  reservationId: string | null;
  expiresAt: string | null;
};

type PayResponse = {
  username: string;
  seatId: string;
  status: string;
  reservationId: string | null;
  paymentReferenceId: string | null;
  message: string;
};

type OrderStatusResponse = {
  username: string;
  status: string;
  message: string;
  seatId: string | null;
  reservationId: string | null;
  expiresAt: string | null;
};

type ApiError = {
  error?: string;
  message?: string;
  status?: string;
};

type ApiFailure = {
  message: string;
  payload: unknown;
  statusCode?: number;
};

const seatCardClassName: Record<SeatStatus['status'], string> = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  reserved: 'border-amber-200 bg-amber-50 text-amber-900',
  reserved_by_you: 'border-sky-300 bg-sky-50 text-sky-900',
  paid: 'border-slate-300 bg-slate-100 text-slate-600',
  paid_by_you: 'border-indigo-300 bg-indigo-50 text-indigo-900',
};

export default function HomePage() {
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [saleStatus, setSaleStatus] = useState<SaleStatus | null>(null);
  const [buyResult, setBuyResult] = useState<BuyResponse | null>(null);
  const [payResult, setPayResult] = useState<PayResponse | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatusResponse | null>(
    null,
  );
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const activeReservationId =
    orderStatus?.reservationId ?? buyResult?.reservationId ?? null;

  useEffect(() => {
    void initialize();
  }, []);

  async function initialize() {
    try {
      const session = await fetchSession();
      setAuth(session);
      await Promise.all([refreshSaleStatus(), refreshOrderStatus()]);
    } catch (error) {
      if (isApiFailure(error) && error.statusCode === 401) {
        setAuth(null);
      } else if (isApiFailure(error)) {
        setLastError(error.message);
      } else {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setAuthResolved(true);
    }
  }

  function isApiFailure(error: unknown): error is ApiFailure {
    return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      'payload' in error
    );
  }

  async function readResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    const data = text ? (JSON.parse(text) as T | ApiError) : {};

    if (!response.ok) {
      const errorData = data as ApiError;
      throw {
        message:
          errorData.message ??
          errorData.error ??
          errorData.status ??
          response.statusText,
        payload: data,
        statusCode: response.status,
      } satisfies ApiFailure;
    }

    return data as T;
  }

  async function fetchSession(): Promise<AuthSession> {
    const response = await fetch('/api/auth/me', {
      cache: 'no-store',
      credentials: 'same-origin',
    });

    return readResponse<AuthSession>(response);
  }

  async function refreshSaleStatus() {
    setIsLoadingStatus(true);
    setLastError(null);

    try {
      const response = await fetch('/api/seat-reservation/status', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = await readResponse<SaleStatus>(response);
      setSaleStatus(data);
    } catch (error) {
      if (isApiFailure(error)) {
        setLastError(error.message);
      } else {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setIsLoadingStatus(false);
    }
  }

  async function refreshOrderStatus() {
    setLastError(null);

    try {
      const response = await fetch('/api/reservations/status', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = await readResponse<OrderStatusResponse>(response);
      setOrderStatus(data);
    } catch (error) {
      if (isApiFailure(error) && error.statusCode === 401) {
        setAuth(null);
      } else if (isApiFailure(error)) {
        setLastError(error.message);
      } else {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    }
  }

  async function attemptReserve() {
    if (!selectedSeatId) {
      setLastError('Please select a seat first.');
      return;
    }

    setIsBuying(true);
    setLastError(null);

    try {
      const response = await fetch('/api/reservations/reserve', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ seatId: selectedSeatId }),
      });
      const data = await readResponse<BuyResponse>(response);
      setBuyResult(data);
      await Promise.all([refreshSaleStatus(), refreshOrderStatus()]);
    } catch (error) {
      if (isApiFailure(error)) {
        setLastError(error.message);
      } else {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setIsBuying(false);
    }
  }

  async function attemptPay() {
    if (!activeReservationId) {
      setLastError('You do not have an active reservation to pay.');
      return;
    }

    setIsPaying(true);
    setLastError(null);

    try {
      const response = await fetch('/api/reservations/pay', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reservationId: activeReservationId }),
      });
      const data = await readResponse<PayResponse>(response);
      setPayResult(data);
      await Promise.all([refreshSaleStatus(), refreshOrderStatus()]);
    } catch (error) {
      if (isApiFailure(error)) {
        setLastError(error.message);
      } else {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setIsPaying(false);
    }
  }

  async function logout() {
    setIsLoggingOut(true);
    setLastError(null);

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
      setAuth(null);
      setSaleStatus(null);
      setBuyResult(null);
      setPayResult(null);
      setOrderStatus(null);
      setSelectedSeatId(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (!authResolved) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-10 shadow-sm">
          Loading session...
        </div>
      </main>
    );
  }

  if (!auth) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <h1 className="text-3xl font-semibold">Seat Reservation System</h1>
          <p className="mt-4 text-sm text-slate-600">
            Sign in with one of the seeded demo accounts to view live seat
            availability and reserve a seat.
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Go to login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Signed in as</p>
              <h1 className="mt-1 text-3xl font-semibold">{auth.username}</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                Pick one seat, reserve it, and complete payment before the
                reservation expires. Seats marked reserved or paid by other
                users are unavailable.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ActionButton
                label="Refresh seats"
                loadingLabel="Refreshing..."
                isLoading={isLoadingStatus}
                onClick={() => void refreshSaleStatus()}
                variant="neutral"
              />
              <ActionButton
                label="Refresh my status"
                onClick={() => void refreshOrderStatus()}
                variant="secondary"
              />
              <ActionButton
                label="Logout"
                loadingLabel="Logging out..."
                isLoading={isLoggingOut}
                onClick={() => void logout()}
                variant="secondary"
              />
            </div>
          </div>

          {lastError ? (
            <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Error: {lastError}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Available Seats</h2>
              <p className="text-sm text-slate-600">
                {saleStatus
                  ? `${saleStatus.availableSlots} of ${saleStatus.totalStock} seats currently available`
                  : 'Loading latest seat availability...'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ActionButton
                label="Reserve selected seat"
                loadingLabel="Reserving..."
                isLoading={isBuying}
                onClick={() => void attemptReserve()}
                disabled={!selectedSeatId}
                variant="success"
              />
              <ActionButton
                label="Confirm payment"
                loadingLabel="Confirming..."
                isLoading={isPaying}
                onClick={() => void attemptPay()}
                disabled={!activeReservationId}
                variant="primary"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saleStatus?.seats.map((seat) => {
              const canSelect = seat.status === 'available' || seat.status === 'reserved_by_you';
              const isSelected = selectedSeatId === seat.seatId;

              return (
                <button
                  key={seat.seatId}
                  type="button"
                  disabled={!canSelect}
                  onClick={() => setSelectedSeatId(seat.seatId)}
                  className={`rounded-2xl border p-5 text-left transition ${seatCardClassName[seat.status]} ${isSelected ? 'ring-2 ring-slate-900' : ''} disabled:cursor-not-allowed disabled:opacity-75`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">{seat.seatId}</span>
                    <span className="rounded-full bg-white/70 px-2 py-1 text-xs uppercase tracking-wide">
                      {seat.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-3 text-sm">
                    {seat.status === 'available' && 'Ready to reserve'}
                    {seat.status === 'reserved' &&
                      'Temporarily held by another user'}
                    {seat.status === 'reserved_by_you' &&
                      'Currently reserved by you'}
                    {seat.status === 'paid' && 'Already purchased'}
                    {seat.status === 'paid_by_you' && 'Purchased by you'}
                  </p>
                  {seat.expiresAt ? (
                    <p className="mt-2 text-xs">
                      Expires at {new Date(seat.expiresAt).toLocaleString()}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <JsonPanel title="Sale status" value={saleStatus} />
          <JsonPanel title="My status" value={orderStatus} />
          <JsonPanel title="Payment result" value={payResult ?? buyResult} />
        </section>
      </div>
    </main>
  );
}
