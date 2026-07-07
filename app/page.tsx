import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BarChart3, Users, TrendingUp } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
            <span className="text-sm font-medium text-primary">Retail Management Platform</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-6">
            Commission & Payroll System
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Automate commission tracking, manage agents across multiple shops, and process payroll seamlessly.
            Built for retail businesses that scale.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/auth/shop-login">
              <Button size="lg" className="w-full sm:w-auto px-8">
                Shop Owner Login
              </Button>
            </Link>
            <Link href="/auth/shop-register">
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
                Create Shop
              </Button>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/auth/agent-login">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto px-8">
                Agent Login
              </Button>
            </Link>
            <Link href="/auth/agent-register">
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
                Register as Agent
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          <Card className="p-6 border border-border">
            <BarChart3 className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Commission Tracking</h3>
            <p className="text-muted-foreground">
              Real-time tracking of agent sales and automatic commission calculation
            </p>
          </Card>

          <Card className="p-6 border border-border">
            <Users className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Payroll Management</h3>
            <p className="text-muted-foreground">
              Manage staff attendance, salary, withdrawals, and generate monthly payroll
            </p>
          </Card>

          <Card className="p-6 border border-border">
            <TrendingUp className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Analytics & Reports</h3>
            <p className="text-muted-foreground">
              Comprehensive reports on commissions, payroll, and staff productivity
            </p>
          </Card>
        </div>

        {/* Security note */}
        <div className="bg-card border border-border rounded-lg p-6 max-w-2xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            Multi-tenant platform with complete data isolation. Each shop's data is completely isolated with secure
            authentication.
          </p>
        </div>
      </div>
    </div>
  )
}
