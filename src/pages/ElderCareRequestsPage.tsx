import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Search, Loader2, Filter, Eye, Phone, User, CheckCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rawClient as apiClient } from "@/services/api/client";

type ElderCareRequest = {
  id: string;
  full_name: string;
  phone_number: string;
  city: string;
  service_type: string;
  patient_condition?: string;
  preferred_duty_hours?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  created_at: string;
};

export default function ElderCareRequestsPage() {
  const [requests, setRequests] = useState<ElderCareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<ElderCareRequest | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(
        `/elder-care?page=1&size=100${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`
      );
      const data = (res.data as any)?.data ?? res.data;
      setRequests(data?.items || []);
    } catch (error) {
      console.error("Failed to fetch elder care requests", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await apiClient.patch(`/elder-care/${id}`, { status: newStatus });
      fetchRequests();
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest({ ...selectedRequest, status: newStatus as any });
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredRequests = requests.filter(
    (r) =>
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.phone_number.includes(search) ||
      r.service_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Elder Care Requests</h2>
          <p className="text-muted-foreground">
            Manage incoming requests for elderly care services.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone or service..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="w-[180px]">Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Service Required</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No requests found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {format(new Date(r.created_at), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{r.phone_number}</p>
                  </TableCell>
                  <TableCell>{r.city}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-600/20">
                      {r.service_type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusColor(
                        r.status
                      )}`}
                    >
                      {r.status.replace("_", " ").toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(r)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(o) => !o && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Elder Care Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="grid gap-6 py-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                  <Select
                    value={selectedRequest.status}
                    onValueChange={(v) => updateStatus(selectedRequest.id, v)}
                  >
                    <SelectTrigger className={`w-[140px] h-8 text-xs ${getStatusColor(selectedRequest.status)}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-right">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Date Submitted</h4>
                  <p className="text-sm font-medium">
                    {format(new Date(selectedRequest.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <User className="h-3.5 w-3.5" /> Customer Name
                    </h4>
                    <p className="text-sm font-medium">{selectedRequest.full_name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <Phone className="h-3.5 w-3.5" /> Phone Number
                    </h4>
                    <a
                      href={`tel:${selectedRequest.phone_number}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {selectedRequest.phone_number}
                    </a>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <User className="h-3.5 w-3.5" /> City
                    </h4>
                    <p className="text-sm font-medium">{selectedRequest.city}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Service Type
                    </h4>
                    <p className="text-sm font-medium">{selectedRequest.service_type}</p>
                  </div>
                  {selectedRequest.preferred_duty_hours && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                        <Clock className="h-3.5 w-3.5" /> Duty Hours (Legacy)
                      </h4>
                      <p className="text-sm font-medium">{selectedRequest.preferred_duty_hours}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedRequest.patient_condition && (
                <div className="rounded-lg bg-slate-50 p-4 border">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Patient Condition & Requirement (Legacy)
                  </h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                    {selectedRequest.patient_condition}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
