"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, ShoppingCart } from "lucide-react";

interface SalesClientProps {
  shopId: string;
  user?: any;
}

export function ShopSalesPage({ shopId, user }: SalesClientProps) {
  const [sales, setSales] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    fetchSales();
  }, [shopId]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/shops/${shopId}/sales`);
      if (!res.ok) throw new Error("Failed to fetch sales");
      const data = await res.json();
      setSales(data.sales || []);
    } catch (error) {
      console.error("Sales error:", error);
      toast.error("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter((sale) =>
    sale.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.id?.toString().includes(searchQuery)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
        <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Sale</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-muted-foreground">
                Sale creation form would go here. This is a placeholder for the actual implementation.
              </p>
              <Button 
                className="mt-4" 
                onClick={() => {
                  toast.success("Sale created successfully");
                  setIsAddDialogOpen(false);
                  fetchSales();
                }}
              >
                Create Sale (Demo)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by customer name or sale ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No sales found</p>
              {searchQuery && (
                <Button variant="link" onClick={() => setSearchQuery("")}>
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      Sale #{sale.id} - {sale.customerName || "Walk-in"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(sale.createdAt)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {sale.items?.length || 0} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(sale.totalAmount)}</p>
                    <p className="text-sm text-muted-foreground capitalize">{sale.paymentMethod}</p>
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