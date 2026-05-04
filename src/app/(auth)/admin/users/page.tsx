"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  UserCircle,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  MoreHorizontal,
  Mail,
  UserX,
  UserCheck,
  Eye,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminType {
  _id: string | { toString(): string };
  name: string;
  email: string;
  createdAt: string | number | Date;
  isActive?: boolean;
}

interface StudentType {
  _id: string | { toString(): string };
  name: string;
  email: string;
  createdAt: string | number | Date;
  purchasedCourses?: string[];
  isActive?: boolean;
}

interface TeacherType {
  _id: string | { toString(): string };
  name: string;
  email: string;
  upiId?: string;
  age?: number;
  createdAt: string | number | Date;
  coursesCreated?: string[];
  isActive?: boolean;
}

interface AdminUsersPageProps {
  students?: StudentType[];
  teachers?: TeacherType[];
  admins?: AdminType[];
}

export default function AdminUsersPage({
  students: initialStudents = [],
  teachers: initialTeachers = [],
  admins: initialAdmins = [],
}: AdminUsersPageProps = {}) {
  const { data: session } = useSession();
  const [students, setStudents] = useState<StudentType[]>(initialStudents);
  const [teachers, setTeachers] = useState<TeacherType[]>(initialTeachers);
  const [admins, setAdmins] = useState<AdminType[]>(initialAdmins);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [suspendDialog, setSuspendDialog] = useState<{
    open: boolean;
    userId: string;
    userType: string;
    userName: string;
    currentStatus: boolean;
  }>({
    open: false,
    userId: "",
    userType: "",
    userName: "",
    currentStatus: true,
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string>("");
  const [deletingAdminId, setDeletingAdminId] = useState<string>("");
  const [createStudentDialogOpen, setCreateStudentDialogOpen] = useState(false);
  const [createTeacherDialogOpen, setCreateTeacherDialogOpen] = useState(false);
  const [editStudentDialogOpen, setEditStudentDialogOpen] = useState(false);
  const [editTeacherDialogOpen, setEditTeacherDialogOpen] = useState(false);
  const [deletingUserDialog, setDeletingUserDialog] = useState<{
    open: boolean;
    userId: string;
    userType: "student" | "teacher" | "";
    userName: string;
  }>({
    open: false,
    userId: "",
    userType: "",
    userName: "",
  });
  const [editingStudentId, setEditingStudentId] = useState<string>("");
  const [editingTeacherId, setEditingTeacherId] = useState<string>("");
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    email: "",
    password: "",
    upiId: "",
    age: "",
  });
  const [activeUserTab, setActiveUserTab] = useState<"students" | "teachers" | "admins">(
    "students"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [studentsPage, setStudentsPage] = useState(1);
  const [teachersPage, setTeachersPage] = useState(1);
  const [adminsPage, setAdminsPage] = useState(1);
  const USERS_PER_PAGE = 8;

  const router = useRouter();
  const toIdString = (id: string | { toString(): string }) =>
    typeof id === "string" ? id : id.toString();
  const matchesSearch = useCallback(
    (name: string, email: string) =>
      `${name} ${email}`.toLowerCase().includes(searchQuery.trim().toLowerCase()),
    [searchQuery]
  );
  const matchesStatus = useCallback(
    (isActive?: boolean) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return isActive !== false;
      return isActive === false;
    },
    [statusFilter]
  );

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          matchesSearch(student.name, student.email) && matchesStatus(student.isActive)
      ),
    [students, matchesSearch, matchesStatus]
  );
  const filteredTeachers = useMemo(
    () =>
      teachers.filter(
        (teacher) =>
          matchesSearch(teacher.name, teacher.email) && matchesStatus(teacher.isActive)
      ),
    [teachers, matchesSearch, matchesStatus]
  );
  const filteredAdmins = useMemo(
    () =>
      admins.filter(
        (admin) => matchesSearch(admin.name, admin.email) && matchesStatus(admin.isActive)
      ),
    [admins, matchesSearch, matchesStatus]
  );

  const studentsTotalPages = Math.max(1, Math.ceil(filteredStudents.length / USERS_PER_PAGE));
  const teachersTotalPages = Math.max(1, Math.ceil(filteredTeachers.length / USERS_PER_PAGE));
  const adminsTotalPages = Math.max(1, Math.ceil(filteredAdmins.length / USERS_PER_PAGE));

  const pagedStudents = filteredStudents.slice(
    (studentsPage - 1) * USERS_PER_PAGE,
    studentsPage * USERS_PER_PAGE
  );
  const pagedTeachers = filteredTeachers.slice(
    (teachersPage - 1) * USERS_PER_PAGE,
    teachersPage * USERS_PER_PAGE
  );
  const pagedAdmins = filteredAdmins.slice(
    (adminsPage - 1) * USERS_PER_PAGE,
    adminsPage * USERS_PER_PAGE
  );

  // Fetch all users data
  useEffect(() => {
    const fetchUsersData = async () => {
      try {
        setDataLoading(true);
        setError(null);

        const response = await fetch('/api/admin/users');
        const data = await response.json();

        if (response.ok) {
          setStudents(data.students || []);
          setTeachers(data.teachers || []);
          setAdmins(data.admins || []);
        } else {
          setError(data.error || 'Failed to load user data');
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load user data');
      } finally {
        setDataLoading(false);
      }
    };

    fetchUsersData();
  }, []);

  useEffect(() => {
    setStudentsPage(1);
    setTeachersPage(1);
    setAdminsPage(1);
  }, [searchQuery, statusFilter, activeUserTab]);

  const handleSuspendAccount = async () => {
    setLoading(suspendDialog.userId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/users/${suspendDialog.userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: suspendDialog.currentStatus ? "suspend" : "activate",
          userType: suspendDialog.userType,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const newStatus = !suspendDialog.currentStatus;
        
        // Update local state based on user type
        if (suspendDialog.userType === "student") {
          setStudents(prev =>
            prev.map(student =>
              toIdString(student._id) === suspendDialog.userId
                ? { ...student, isActive: newStatus }
                : student
            )
          );
        } else if (suspendDialog.userType === "teacher") {
          setTeachers(prev =>
            prev.map(teacher =>
              toIdString(teacher._id) === suspendDialog.userId
                ? { ...teacher, isActive: newStatus }
                : teacher
            )
          );
        } else if (suspendDialog.userType === "admin") {
          setAdmins(prev =>
            prev.map(admin =>
              toIdString(admin._id) === suspendDialog.userId
                ? { ...admin, isActive: newStatus }
                : admin
            )
          );
        }

        setSuccess(
          `${suspendDialog.userName} has been ${
            newStatus ? "activated" : "suspended"
          } successfully.`
        );
        setSuspendDialog({ open: false, userId: "", userType: "", userName: "", currentStatus: true });
      } else {
        throw new Error(result.error || "Failed to update user status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  const handleViewProfile = (userId: string, userType: string) => {
    router.push(`/admin/users/${userId}?type=${userType}`);
  };

  const handleViewCourses = (teacherId: string) => {
    router.push(`/teacher/courses?teacherId=${teacherId}&adminView=true`);
  };

  const handleEmailUser = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const openSuspendDialog = (
    userId: string,
    userType: string,
    userName: string,
    currentStatus: boolean
  ) => {
    setSuspendDialog({
      open: true,
      userId,
      userType,
      userName,
      currentStatus,
    });
  };

  const openCreateDialog = () => {
    setFormState({ name: "", email: "", password: "" });
    setCreateDialogOpen(true);
  };

  const openEditDialog = (admin: AdminType) => {
    setEditingAdminId(toIdString(admin._id));
    setFormState({ name: admin.name, email: admin.email, password: "" });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (adminId: string) => {
    setDeletingAdminId(adminId);
    setDeleteDialogOpen(true);
  };

  const openCreateStudentDialog = () => {
    setStudentForm({ name: "", email: "", password: "" });
    setCreateStudentDialogOpen(true);
  };

  const openCreateTeacherDialog = () => {
    setTeacherForm({ name: "", email: "", password: "", upiId: "", age: "" });
    setCreateTeacherDialogOpen(true);
  };

  const openEditStudentDialog = (student: StudentType) => {
    setEditingStudentId(toIdString(student._id));
    setStudentForm({ name: student.name, email: student.email, password: "" });
    setEditStudentDialogOpen(true);
  };

  const openEditTeacherDialog = (teacher: TeacherType) => {
    setEditingTeacherId(toIdString(teacher._id));
    setTeacherForm({
      name: teacher.name,
      email: teacher.email,
      password: "",
      upiId: teacher.upiId || "",
      age: teacher.age ? String(teacher.age) : "",
    });
    setEditTeacherDialogOpen(true);
  };

  const openDeleteUserDialog = (
    userId: string,
    userType: "student" | "teacher",
    userName: string
  ) => {
    setDeletingUserDialog({
      open: true,
      userId,
      userType,
      userName,
    });
  };

  const handleCreateAdmin = async () => {
    setLoading("create-admin");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create admin");
      setAdmins((prev) => [result.admin, ...prev]);
      setCreateDialogOpen(false);
      setSuccess("Admin account created successfully.");
      setFormState({ name: "", email: "", password: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateAdmin = async () => {
    if (!editingAdminId) return;
    setLoading("update-admin");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/admin/admins/${editingAdminId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update admin");
      setAdmins((prev) =>
        prev.map((admin) =>
          toIdString(admin._id) === editingAdminId ? result.admin : admin
        )
      );
      setEditDialogOpen(false);
      setSuccess("Admin account updated successfully.");
      setFormState({ name: "", email: "", password: "" });
      setEditingAdminId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deletingAdminId) return;
    setLoading("delete-admin");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/admin/admins/${deletingAdminId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete admin");
      setAdmins((prev) =>
        prev.filter((admin) => toIdString(admin._id) !== deletingAdminId)
      );
      setDeleteDialogOpen(false);
      setDeletingAdminId("");
      setSuccess("Admin account deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  const handleCreateStudent = async () => {
    setLoading("create-student");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...studentForm, userType: "student" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create student");
      setStudents((prev) => [result.user, ...prev]);
      setCreateStudentDialogOpen(false);
      setSuccess("Student account created successfully.");
      setStudentForm({ name: "", email: "", password: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  const handleCreateTeacher = async () => {
    setLoading("create-teacher");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...teacherForm,
          age: teacherForm.age ? Number(teacherForm.age) : undefined,
          userType: "teacher",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create teacher");
      setTeachers((prev) => [result.user, ...prev]);
      setCreateTeacherDialogOpen(false);
      setSuccess("Teacher account created successfully.");
      setTeacherForm({ name: "", email: "", password: "", upiId: "", age: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateStudent = async () => {
    if (!editingStudentId) return;
    setLoading("update-student");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/admin/users/${editingStudentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...studentForm, userType: "student" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update student");
      setStudents((prev) =>
        prev.map((student) =>
          toIdString(student._id) === editingStudentId ? result.user : student
        )
      );
      setEditStudentDialogOpen(false);
      setEditingStudentId("");
      setSuccess("Student account updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateTeacher = async () => {
    if (!editingTeacherId) return;
    setLoading("update-teacher");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/admin/users/${editingTeacherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...teacherForm,
          age: teacherForm.age ? Number(teacherForm.age) : undefined,
          userType: "teacher",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update teacher");
      setTeachers((prev) =>
        prev.map((teacher) =>
          toIdString(teacher._id) === editingTeacherId ? result.user : teacher
        )
      );
      setEditTeacherDialogOpen(false);
      setEditingTeacherId("");
      setSuccess("Teacher account updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUserDialog.userId || !deletingUserDialog.userType) return;
    setLoading("delete-user");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/admin/users/${deletingUserDialog.userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userType: deletingUserDialog.userType }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete user");

      if (deletingUserDialog.userType === "student") {
        setStudents((prev) =>
          prev.filter((student) => toIdString(student._id) !== deletingUserDialog.userId)
        );
      } else {
        setTeachers((prev) =>
          prev.filter((teacher) => toIdString(teacher._id) !== deletingUserDialog.userId)
        );
      }
      setDeletingUserDialog({ open: false, userId: "", userType: "", userName: "" });
      setSuccess(
        `${deletingUserDialog.userType === "student" ? "Student" : "Teacher"} deleted successfully.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/dashboard">Back to Dashboard</Link>
          </Button>
          {activeUserTab === "students" && (
            <Button  onClick={openCreateStudentDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          )}
          {activeUserTab === "teachers" && (
            <Button onClick={openCreateTeacherDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Teacher
            </Button>
          )}
          {activeUserTab === "admins" && (
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
          )}
        </div>
      </div>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input
          placeholder="Search by name or email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="w-full border rounded-md px-3 py-2 bg-background"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "active" | "suspended")
          }
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="suspended">Suspended only</option>
        </select>
        <Button
          variant="outline"
          onClick={() => {
            setSearchQuery("");
            setStatusFilter("all");
          }}
        >
          Reset Filters
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {dataLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading user data...</p>
          </div>
        </div>
      ) : (
        <Tabs
          value={activeUserTab}
          onValueChange={(value) =>
            setActiveUserTab(value as "students" | "teachers" | "admins")
          }
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="students" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Students ({filteredStudents.length})
            </TabsTrigger>
            <TabsTrigger value="teachers" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Teachers ({filteredTeachers.length})
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Admins ({filteredAdmins.length})
            </TabsTrigger>
          </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>
                Manage student accounts and enrollments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedStudents.map((student: StudentType) => (
                    <TableRow key={toIdString(student._id)}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                        {student.name}
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={student.isActive !== false ? "default" : "secondary"}
                          className={
                            student.isActive !== false
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {student.isActive !== false ? "Active" : "Suspended"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(student.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {student.purchasedCourses?.length || 0}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleEmailUser(student.email)}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              <span>Email Student</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleViewProfile(toIdString(student._id), "student")}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditStudentDialog(student)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit Student</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                openDeleteUserDialog(
                                  toIdString(student._id),
                                  "student",
                                  student.name
                                )
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete Student</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className={
                                student.isActive !== false
                                  ? "text-destructive"
                                  : "text-green-600"
                              }
                              onClick={() =>
                                openSuspendDialog(
                                  toIdString(student._id),
                                  "student",
                                  student.name,
                                  student.isActive !== false
                                )
                              }
                              disabled={loading === toIdString(student._id)}
                            >
                              {student.isActive !== false ? (
                                <UserX className="mr-2 h-4 w-4" />
                              ) : (
                                <UserCheck className="mr-2 h-4 w-4" />
                              )}
                              <span>
                                {loading === toIdString(student._id)
                                  ? "Processing..."
                                  : student.isActive !== false
                                  ? "Suspend Account"
                                  : "Activate Account"}
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {studentsPage} of {studentsTotalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={studentsPage <= 1}
                    onClick={() => setStudentsPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={studentsPage >= studentsTotalPages}
                    onClick={() =>
                      setStudentsPage((p) => Math.min(studentsTotalPages, p + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers">
          <Card>
            <CardHeader>
              <CardTitle>Teachers</CardTitle>
              <CardDescription>
                Manage teacher accounts and courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedTeachers.map((teacher: TeacherType) => (
                    <TableRow key={toIdString(teacher._id)}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                        {teacher.name}
                      </TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={teacher.isActive !== false ? "default" : "secondary"}
                          className={
                            teacher.isActive !== false
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {teacher.isActive !== false ? "Active" : "Suspended"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(teacher.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {teacher.coursesCreated?.length || 0}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleEmailUser(teacher.email)}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              <span>Email Teacher</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleViewProfile(toIdString(teacher._id), "teacher")}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleViewCourses(toIdString(teacher._id))}
                            >
                              <BookOpen className="mr-2 h-4 w-4" />
                              <span>View Courses</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditTeacherDialog(teacher)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit Teacher</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                openDeleteUserDialog(
                                  toIdString(teacher._id),
                                  "teacher",
                                  teacher.name
                                )
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete Teacher</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className={
                                teacher.isActive !== false
                                  ? "text-destructive"
                                  : "text-green-600"
                              }
                              onClick={() =>
                                openSuspendDialog(
                                  toIdString(teacher._id),
                                  "teacher",
                                  teacher.name,
                                  teacher.isActive !== false
                                )
                              }
                              disabled={loading === toIdString(teacher._id)}
                            >
                              {teacher.isActive !== false ? (
                                <UserX className="mr-2 h-4 w-4" />
                              ) : (
                                <UserCheck className="mr-2 h-4 w-4" />
                              )}
                              <span>
                                {loading === toIdString(teacher._id)
                                  ? "Processing..."
                                  : teacher.isActive !== false
                                  ? "Suspend Account"
                                  : "Activate Account"}
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {teachersPage} of {teachersTotalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={teachersPage <= 1}
                    onClick={() => setTeachersPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={teachersPage >= teachersTotalPages}
                    onClick={() =>
                      setTeachersPage((p) => Math.min(teachersTotalPages, p + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <CardTitle>Administrators</CardTitle>
              <CardDescription>Manage admin accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedAdmins.map((admin: AdminType) => (
                    <TableRow key={toIdString(admin._id)}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                        {admin.name}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={admin.isActive !== false ? "default" : "secondary"}
                          className={
                            admin.isActive !== false
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {admin.isActive !== false ? "Active" : "Suspended"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleEmailUser(admin.email)}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              <span>Email Admin</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleViewProfile(toIdString(admin._id), "admin")}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditDialog(admin)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit Admin</span>
                            </DropdownMenuItem>
                            {session?.user?.email !== admin.email && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => openDeleteDialog(toIdString(admin._id))}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete Admin</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className={
                                admin.isActive !== false
                                  ? "text-destructive"
                                  : "text-green-600"
                              }
                              onClick={() =>
                                openSuspendDialog(
                                  toIdString(admin._id),
                                  "admin",
                                  admin.name,
                                  admin.isActive !== false
                                )
                              }
                              disabled={loading === toIdString(admin._id)}
                            >
                              {admin.isActive !== false ? (
                                <UserX className="mr-2 h-4 w-4" />
                              ) : (
                                <UserCheck className="mr-2 h-4 w-4" />
                              )}
                              <span>
                                {loading === toIdString(admin._id)
                                  ? "Processing..."
                                  : admin.isActive !== false
                                  ? "Revoke Access"
                                  : "Restore Access"}
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {adminsPage} of {adminsTotalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={adminsPage <= 1}
                    onClick={() => setAdminsPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={adminsPage >= adminsTotalPages}
                    onClick={() =>
                      setAdminsPage((p) => Math.min(adminsTotalPages, p + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

      {/* Suspend/Activate Confirmation Dialog */}
      <AlertDialog open={suspendDialog.open} onOpenChange={(open) => 
        setSuspendDialog(prev => ({ ...prev, open }))
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendDialog.currentStatus ? "Suspend Account" : "Activate Account"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {suspendDialog.currentStatus ? "suspend" : "activate"}{" "}
              <strong>{suspendDialog.userName}</strong>? This action will{" "}
              {suspendDialog.currentStatus
                ? "disable their access to the platform"
                : "restore their access to the platform"}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendAccount}
              className={
                suspendDialog.currentStatus
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {suspendDialog.currentStatus ? "Suspend" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Admin</DialogTitle>
            <DialogDescription>
              Add a new administrator account with full admin access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={formState.name}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Admin name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={formState.email}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="admin@domain.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                value={formState.password}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Strong password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAdmin} disabled={loading === "create-admin"}>
              {loading === "create-admin" ? "Creating..." : "Create Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
            <DialogDescription>
              Update admin profile details. Password is optional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formState.name}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formState.email}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">New Password (Optional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formState.password}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Leave blank to keep current password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAdmin} disabled={loading === "update-admin"}>
              {loading === "update-admin" ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the admin account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAdmin}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading === "delete-admin" ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createStudentDialogOpen} onOpenChange={setCreateStudentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Student</DialogTitle>
            <DialogDescription>Add a new student account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student-create-name">Name</Label>
              <Input
                id="student-create-name"
                value={studentForm.name}
                onChange={(e) =>
                  setStudentForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-create-email">Email</Label>
              <Input
                id="student-create-email"
                type="email"
                value={studentForm.email}
                onChange={(e) =>
                  setStudentForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-create-password">Password</Label>
              <Input
                id="student-create-password"
                type="password"
                value={studentForm.password}
                onChange={(e) =>
                  setStudentForm((prev) => ({ ...prev, password: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateStudentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateStudent}
              disabled={loading === "create-student"}
            >
              {loading === "create-student" ? "Creating..." : "Create Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createTeacherDialogOpen} onOpenChange={setCreateTeacherDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Teacher</DialogTitle>
            <DialogDescription>Add a new teacher account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-create-name">Name</Label>
              <Input
                id="teacher-create-name"
                value={teacherForm.name}
                onChange={(e) =>
                  setTeacherForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-create-email">Email</Label>
              <Input
                id="teacher-create-email"
                type="email"
                value={teacherForm.email}
                onChange={(e) =>
                  setTeacherForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-create-upi">UPI ID</Label>
              <Input
                id="teacher-create-upi"
                value={teacherForm.upiId}
                onChange={(e) =>
                  setTeacherForm((prev) => ({ ...prev, upiId: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-create-age">Age (optional)</Label>
              <Input
                id="teacher-create-age"
                type="number"
                value={teacherForm.age}
                onChange={(e) =>
                  setTeacherForm((prev) => ({ ...prev, age: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-create-password">Password</Label>
              <Input
                id="teacher-create-password"
                type="password"
                value={teacherForm.password}
                onChange={(e) =>
                  setTeacherForm((prev) => ({ ...prev, password: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTeacherDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTeacher}
              disabled={loading === "create-teacher"}
            >
              {loading === "create-teacher" ? "Creating..." : "Create Teacher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editStudentDialogOpen} onOpenChange={setEditStudentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student details. Password is optional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student-edit-name">Name</Label>
              <Input
                id="student-edit-name"
                value={studentForm.name}
                onChange={(e) =>
                  setStudentForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-edit-email">Email</Label>
              <Input
                id="student-edit-email"
                type="email"
                value={studentForm.email}
                onChange={(e) =>
                  setStudentForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-edit-password">New Password (optional)</Label>
              <Input
                id="student-edit-password"
                type="password"
                value={studentForm.password}
                onChange={(e) =>
                  setStudentForm((prev) => ({ ...prev, password: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStudentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStudent}
              disabled={loading === "update-student"}
            >
              {loading === "update-student" ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editTeacherDialogOpen} onOpenChange={setEditTeacherDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
            <DialogDescription>
              Update teacher details. Password is optional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-edit-name">Name</Label>
              <Input
                id="teacher-edit-name"
                value={teacherForm.name}
                onChange={(e) =>
                  setTeacherForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-edit-email">Email</Label>
              <Input
                id="teacher-edit-email"
                type="email"
                value={teacherForm.email}
                onChange={(e) =>
                  setTeacherForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-edit-upi">UPI ID</Label>
              <Input
                id="teacher-edit-upi"
                value={teacherForm.upiId}
                onChange={(e) =>
                  setTeacherForm((prev) => ({ ...prev, upiId: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-edit-age">Age (optional)</Label>
              <Input
                id="teacher-edit-age"
                type="number"
                value={teacherForm.age}
                onChange={(e) =>
                  setTeacherForm((prev) => ({ ...prev, age: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-edit-password">New Password (optional)</Label>
              <Input
                id="teacher-edit-password"
                type="password"
                value={teacherForm.password}
                onChange={(e) =>
                  setTeacherForm((prev) => ({ ...prev, password: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTeacherDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTeacher}
              disabled={loading === "update-teacher"}
            >
              {loading === "update-teacher" ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletingUserDialog.open}
        onOpenChange={(open) =>
          setDeletingUserDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deletingUserDialog.userName}</strong>? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading === "delete-user" ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}