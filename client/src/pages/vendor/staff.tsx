import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  User, 
  Plus,
  Edit,
  Shield,
  Trash2,
  UserCog,
  Clock,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Restaurant, RestaurantStaff } from "@shared/schema";

export default function VendorStaff() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [isCreateStaffOpen, setIsCreateStaffOpen] = useState(false);
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<RestaurantStaff | null>(null);
  
  // Form state
  const [newStaff, setNewStaff] = useState({
    role: 'staff',
    employeeId: '',
    hourlyWage: '',
    isActive: true,
    canLogin: true,
    permissions: {
      orders: false,
      menu: false,
      analytics: false,
      settings: false,
      staff: false
    }
  });

  // Fetch vendor's restaurant data
  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  // Fetch staff members
  const { data: staff = [], isLoading: staffLoading } = useQuery<RestaurantStaff[]>({
    queryKey: ["/api/vendor/staff"],
    enabled: !!restaurant,
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: async (staffData: any) => {
      const response = await apiRequest('POST', '/api/vendor/staff', {
        ...staffData,
        userId: null, // Will be handled by backend
        startDate: new Date()
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/staff'] });
      setNewStaff({
        role: 'staff', employeeId: '', hourlyWage: '', isActive: true, canLogin: true,
        permissions: { orders: false, menu: false, analytics: false, settings: false, staff: false }
      });
      setIsCreateStaffOpen(false);
      toast({ title: 'Success', description: 'Staff member added successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add staff member', variant: 'destructive' });
    }
  });

  // Edit staff mutation
  const editStaffMutation = useMutation({
    mutationFn: async (updates: Partial<RestaurantStaff> & { id: string }) => {
      const { id, ...data } = updates;
      return await apiRequest("PATCH", `/api/vendor/staff/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/staff'] });
      setEditingStaff(null);
      setIsEditStaffOpen(false);
      toast({ title: 'Success', description: 'Staff member updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update staff member', variant: 'destructive' });
    }
  });

  // Delete staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      return await apiRequest("DELETE", `/api/vendor/staff/${staffId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/staff'] });
      toast({ title: 'Success', description: 'Staff member removed successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to remove staff member', variant: 'destructive' });
    }
  });

  if (staffLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="vendor-staff-page">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
        <Dialog open={isCreateStaffOpen} onOpenChange={setIsCreateStaffOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90" data-testid="button-add-staff">
              <Plus className="mr-2 h-4 w-4" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" data-testid="dialog-create-staff">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>Add a new team member to help manage your restaurant operations.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employee-id">Employee ID</Label>
                  <Input
                    id="employee-id"
                    value={newStaff.employeeId}
                    onChange={(e) => setNewStaff({...newStaff, employeeId: e.target.value})}
                    placeholder="e.g., EMP001"
                    data-testid="input-employee-id"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newStaff.role} onValueChange={(value) => setNewStaff({...newStaff, role: value})}>
                    <SelectTrigger data-testid="select-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="hourly-wage">Hourly Wage (₱)</Label>
                <Input
                  id="hourly-wage"
                  type="number"
                  step="0.01"
                  value={newStaff.hourlyWage}
                  onChange={(e) => setNewStaff({...newStaff, hourlyWage: e.target.value})}
                  placeholder="15.00"
                  data-testid="input-hourly-wage"
                />
              </div>
              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="orders"
                      checked={newStaff.permissions.orders}
                      onCheckedChange={(checked) => setNewStaff({
                        ...newStaff,
                        permissions: {...newStaff.permissions, orders: checked as boolean}
                      })}
                    />
                    <Label htmlFor="orders">Manage Orders</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="menu"
                      checked={newStaff.permissions.menu}
                      onCheckedChange={(checked) => setNewStaff({
                        ...newStaff,
                        permissions: {...newStaff.permissions, menu: checked as boolean}
                      })}
                    />
                    <Label htmlFor="menu">Manage Menu</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="analytics"
                      checked={newStaff.permissions.analytics}
                      onCheckedChange={(checked) => setNewStaff({
                        ...newStaff,
                        permissions: {...newStaff.permissions, analytics: checked as boolean}
                      })}
                    />
                    <Label htmlFor="analytics">View Analytics</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="settings"
                      checked={newStaff.permissions.settings}
                      onCheckedChange={(checked) => setNewStaff({
                        ...newStaff,
                        permissions: {...newStaff.permissions, settings: checked as boolean}
                      })}
                    />
                    <Label htmlFor="settings">Manage Settings</Label>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-active"
                    checked={newStaff.isActive}
                    onCheckedChange={(checked) => setNewStaff({...newStaff, isActive: checked})}
                  />
                  <Label htmlFor="is-active">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="can-login"
                    checked={newStaff.canLogin}
                    onCheckedChange={(checked) => setNewStaff({...newStaff, canLogin: checked})}
                  />
                  <Label htmlFor="can-login">Can Login</Label>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateStaffOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => createStaffMutation.mutate(newStaff)} data-testid="button-save-staff">
                  Add Staff Member
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {staff.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Staff Members</h3>
          <p className="text-gray-500 dark:text-gray-400">Add your first staff member to manage your restaurant team</p>
          <Button 
            className="mt-4" 
            onClick={() => setIsCreateStaffOpen(true)}
            data-testid="button-add-first-staff"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Staff Member
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {staff.map((member) => (
            <Card key={member.id} data-testid={`card-staff-${member.id}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {member.role.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Staff Member</h3>
                      <p className="text-sm text-gray-500">Employee ID: {member.employeeId || 'N/A'}</p>
                      <p className="text-xs text-gray-400">
                        Started: {member.startDate ? new Date(member.startDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <Badge variant={member.role === 'manager' ? 'default' : 'secondary'}>
                        <Shield className="h-3 w-3 mr-1" />
                        {member.role}
                      </Badge>
                      <div className="mt-1">
                        <Badge variant={member.isActive ? 'default' : 'destructive'}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingStaff(member);
                          setIsEditStaffOpen(true);
                        }}
                        data-testid={`button-edit-staff-${member.id}`}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-staff-${member.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove this staff member? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteStaffMutation.mutate(member.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
                
                {/* Staff Permissions */}
                {member.permissions && typeof member.permissions === 'object' ? (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissions:</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(member.permissions as Record<string, boolean>)
                        .filter(([_, value]) => value)
                        .map(([key]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </Badge>
                        ))}
                    </div>
                  </div>
                ) : null}

                {/* Work Schedule */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Hourly Wage:</span>
                      <span className="ml-2 font-semibold">₱{member.hourlyWage ? parseFloat(member.hourlyWage).toFixed(2) : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Can Login:</span>
                      <span className="ml-2">
                        <Badge variant={member.canLogin ? 'default' : 'secondary'} className="text-xs">
                          {member.canLogin ? 'Yes' : 'No'}
                        </Badge>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}