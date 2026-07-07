"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, AlertCircle } from "lucide-react"
import { getShopToken } from "@/lib/storage-utils"

interface AddAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAgentAdded: () => void
  shopId: number
}

export function AddAgentDialog({ open, onOpenChange, onAgentAdded, shopId }: AddAgentDialogProps) {
  const [activeTab, setActiveTab] = useState<"new" | "existing">("new")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const [newAgent, setNewAgent] = useState({
    name: "",
    phone_number: "",
    description: "",
    commission_rate: "",
    account_name: "",
    account_number: "",
    bank_name: "",
    ifsc_code: "",
    upi_id: "",
  })

  const [existingAgent, setExistingAgent] = useState({
    phone_number: "",
    commission_rate: "",
  })

  const handleAddNewAgent = async () => {
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAgent.name,
          phone_number: newAgent.phone_number,
          description: newAgent.description,
          account_name: newAgent.account_name,
          account_number: newAgent.account_number,
          bank_name: newAgent.bank_name,
          ifsc_code: newAgent.ifsc_code,
          upi_id: newAgent.upi_id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Failed to create agent")
        return
      }

      const agent = await response.json()

      const token = getShopToken()
      const linkResponse = await fetch(`/api/shops/${shopId}/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          agent_id: agent.id,
          commission_rate: Number.parseFloat(newAgent.commission_rate),
        }),
      })

      if (!linkResponse.ok) throw new Error("Failed to link agent")

      onOpenChange(false)
      onAgentAdded()
      setNewAgent({
        name: "",
        phone_number: "",
        description: "",
        commission_rate: "",
        account_name: "",
        account_number: "",
        bank_name: "",
        ifsc_code: "",
        upi_id: "",
      })
    } catch (err) {
      setError("An error occurred")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLinkExistingAgent = async () => {
    setError("")
    setIsLoading(true)

    try {
      const searchResponse = await fetch(`/api/agents?phone=${existingAgent.phone_number}`)

      if (!searchResponse.ok) {
        setError("Agent not found")
        return
      }

      const agents = await searchResponse.json()
      if (agents.length === 0) {
        setError("No agent found with this phone number")
        return
      }

      const agent = agents[0]

      const token = getShopToken()
      const linkResponse = await fetch(`/api/shops/${shopId}/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          agent_id: agent.id,
          commission_rate: Number.parseFloat(existingAgent.commission_rate),
        }),
      })

      if (!linkResponse.ok) {
        const errData = await linkResponse.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to link agent")
      }

      onOpenChange(false)
      onAgentAdded()
      setExistingAgent({ phone_number: "", commission_rate: "" })
    } catch (err) {
      setError("An error occurred")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Agent to Shop</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded flex gap-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="mb-4 flex gap-2">
          <button
            className={`flex-1 rounded px-3 py-2 font-medium transition-colors ${
              activeTab === "new"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
            onClick={() => setActiveTab("new")}
          >
            New Agent
          </button>
          <button
            className={`flex-1 rounded px-3 py-2 font-medium transition-colors ${
              activeTab === "existing"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
            onClick={() => setActiveTab("existing")}
          >
            Existing Agent
          </button>
        </div>

        {activeTab === "new" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Name</label>
              <Input placeholder="Agent name" value={newAgent.name} onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Phone Number</label>
              <Input placeholder="9876543210" value={newAgent.phone_number} onChange={(e) => setNewAgent({ ...newAgent, phone_number: e.target.value })} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
              <Input placeholder="Describe this agent" value={newAgent.description} onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Commission Rate (%)</label>
              <Input
                type="number"
                placeholder="2.5"
                step="0.1"
                value={newAgent.commission_rate}
                onChange={(e) => setNewAgent({ ...newAgent, commission_rate: e.target.value })}
              />
            </div>

            <div className="mt-3 border-t pt-3">
              <p className="mb-2 text-sm font-medium text-foreground">Bank Details (Optional)</p>
              <Input placeholder="Account Name" value={newAgent.account_name} onChange={(e) => setNewAgent({ ...newAgent, account_name: e.target.value })} className="mb-2" />
              <Input placeholder="Account Number" value={newAgent.account_number} onChange={(e) => setNewAgent({ ...newAgent, account_number: e.target.value })} className="mb-2" />
              <Input placeholder="Bank Name" value={newAgent.bank_name} onChange={(e) => setNewAgent({ ...newAgent, bank_name: e.target.value })} className="mb-2" />
              <Input placeholder="IFSC Code" value={newAgent.ifsc_code} onChange={(e) => setNewAgent({ ...newAgent, ifsc_code: e.target.value })} className="mb-2" />
              <Input placeholder="UPI ID" value={newAgent.upi_id} onChange={(e) => setNewAgent({ ...newAgent, upi_id: e.target.value })} />
            </div>

            <Button onClick={handleAddNewAgent} disabled={isLoading || !newAgent.name || !newAgent.phone_number || !newAgent.commission_rate} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Agent"
              )}
            </Button>
          </div>
        )}

        {activeTab === "existing" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Phone Number</label>
              <Input placeholder="9876543210" value={existingAgent.phone_number} onChange={(e) => setExistingAgent({ ...existingAgent, phone_number: e.target.value })} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Commission Rate (%)</label>
              <Input type="number" placeholder="2.5" step="0.1" value={existingAgent.commission_rate} onChange={(e) => setExistingAgent({ ...existingAgent, commission_rate: e.target.value })} />
            </div>

            <Button onClick={handleLinkExistingAgent} disabled={isLoading || !existingAgent.phone_number || !existingAgent.commission_rate} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Linking...
                </>
              ) : (
                "Link Agent"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
