import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Search, Loader2, Filter, Eye, Phone, User, CheckCircle, Clock, Mail } from "lucide-react";
import { Helmet } from "react-helmet-async";
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
import { PageHeader } from "@/components/common/PageHeader";
import { env } from "@/config/env";
import {
  infectionControlService,
  type InfectionControlEnquiry,
} from "@/services/infection-control.service";

export function InfectionControlEnquiriesPage() {
  const [requests, setRequests] = useState<InfectionControlEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<InfectionControlEnquiry | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await infectionControlService.listEnquiries({
        page: 1,
        page_size: 100,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      const data = (res.data as any)?.data ?? res.data;
      setRequests(data?.items || []);
    } catch (error) {
      console.error("Failed to fetch infection control enquiries", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await infectionControlService.updateEnquiryStatus(id, newStatus);
      fetchRequests();
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.full_name.toLowerCase().includes(q) ||
      r.phone_number.includes(q) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      r.requirement_type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <Helmet>
        <title>IC Enquiries · {env.APP_NAME}</title>
      </Helmet>
      <PageHeader
        title="Infection Control Enquiries"
        description="View and manage enquiries submitted from the Infection Control Nurse Services page."
        icon={<Mail />}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Requirement</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No enquiries found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.full_name}</TableCell>
                  <TableCell>{req.phone_number}</TableCell>
                  <TableCell>{req.email || "—"}</TableCell>
                  <TableCell>
                    <span className="text-sm">{req.requirement_type || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(req.status)}`}>
                      {req.status.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {req.created_at ? format(new Date(req.created_at), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedRequest(req)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enquiry Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" /> {selectedRequest.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" /> {selectedRequest.phone_number}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedRequest.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requirement</p>
                  <p className="font-medium">{selectedRequest.requirement_type || "—"}</p>
                </div>
              </div>

              {selectedRequest.message && (
                <div>
                  <p className="text-xs text-muted-foreground">Message</p>
                  <p className="text-sm bg-muted/50 rounded-lg p-3 mt-1">{selectedRequest.message}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {["pending", "in_progress", "completed", "cancelled"].map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={selectedRequest.status === s ? "default" : "outline"}
                      onClick={() => updateStatus(selectedRequest.id, s)}
                    >
                      {s === "pending" && <Clock className="h-3.5 w-3.5 mr-1" />}
                      {s === "in_progress" && <Loader2 className="h-3.5 w-3.5 mr-1" />}
                      {s === "completed" && <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                      {s.replace("_", " ")}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground pt-2">
                Submitted: {selectedRequest.created_at ? format(new Date(selectedRequest.created_at), "dd MMM yyyy, hh:mm a") : "—"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
