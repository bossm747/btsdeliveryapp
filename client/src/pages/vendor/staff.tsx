import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  User, 
  Plus,
  Edit,
  Shield
} from "lucide-react";
import type { Restaurant, RestaurantStaff } from "@shared/schema";

export default function VendorStaff() {
  // Fetch vendor's restaurant data
  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  // Fetch staff members
  const { data: staff = [], isLoading: staffLoading } = useQuery<RestaurantStaff[]>({
    queryKey: ["/api/vendor/staff"],
    enabled: !!restaurant,
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
        <Button className="bg-primary hover:bg-primary/90" data-testid="button-add-staff">
          <Plus className="mr-2 h-4 w-4" />
          Add Staff Member
        </Button>
      </div>

      {staff.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Staff Members</h3>
          <p className="text-gray-500 dark:text-gray-400">Add your first staff member to manage your restaurant team</p>
          <Button className="mt-4" data-testid="button-add-first-staff">
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
                    <Button size="sm" variant="outline" data-testid={`button-edit-staff-${member.id}`}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
                
                {/* Staff Permissions */}
                {member.permissions && typeof member.permissions === 'object' && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissions:</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(member.permissions as Record<string, boolean>).map(([key, value]) => (
                        value && (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </Badge>
                        )
                      ))}
                    </div>
                  </div>
                )}

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