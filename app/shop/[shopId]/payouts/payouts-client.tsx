"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";

interface PayoutsClientProps {
  shopId: string;
  user?: any;
}

export function ShopPayoutsPage({ shopId, user }: PayoutsClientProps) {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPayouts: 0,
    totalAmount: 0,
    pendingAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayouts();
  }, [shopId]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/shops/${shopId}/payouts`);
      if (!res.ok) throw new Error("Failed to fetch payouts");
      const data = await res.json();
      setPayouts(data.payouts || []);
      setStats({
        totalPayouts: data.totalPayouts || 0,
        totalAmount: data.totalAmount || 0,
        pendingAmount: data.pendingAmount || 0,
      });
    } catch (error) {
      console.error("Payouts error:", error);
      toast.error("Failed to load payouts data");
    } finally {
      setLoading(false);
    }
  };

  const requestPayout = async () => {
    try {
      const res = await fetch(`/api/shops/${shopId}/payouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to request payout");
      toast.success("Payout request submitted successfully");
      fetchPayouts();
    } catch (error) {
      console.error("Request payout error:", error);
      toast.error("Failed to request payout");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Payouts</h1>
        <Button onClick={requestPayout}>
          <DollarSign className="h-4 w-4 mr-2" />
          Request Payout
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPayouts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingAmount)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No payouts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium">Payout #{payout.id}</p>
                    <p className="text-sm text-muted-foreground">
                      Requested on {new Date(payout.createdAt).toLocaleDateString("en-IN")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Method: {payout.method || "Bank Transfer"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(payout.amount)}</p>
                    <p className={`text-sm capitalize ${
                      payout.status === "completed" ? "text-green-600" :
                      payout.status === "pending" ? "text-yellow-600" :
                      "text-red-600"
                    }`}>
                      {payout.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}