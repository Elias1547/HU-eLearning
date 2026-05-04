"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Plus,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Teacher = { _id: string; name: string; email: string };
type Course = {
  _id: string;
  name: string;
  description: string;
  syllabus: string;
  duration: string;
  category: string;
  level: string;
  price: number;
  imageUrl?: string;
  isPublished: boolean;
  teacher: Teacher;
  createdAt?: string | Date;
};

const initialForm = {
  name: "",
  description: "",
  syllabus: "",
  duration: "",
  category: "",
  level: "",
  price: "0",
  imageUrl: "",
  teacherId: "",
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("published");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState("");
  const [deletingCourseId, setDeletingCourseId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [publishedPage, setPublishedPage] = useState(1);
  const [unpublishedPage, setUnpublishedPage] = useState(1);
  const COURSES_PER_PAGE = 6;

  const filteredCourses = useMemo(
    () =>
      courses.filter((course) => {
        const matchesSearch = `${course.name} ${course.description} ${course.category} ${course.level}`
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase());
        const matchesTeacher =
          teacherFilter === "all" || String(course.teacher?._id) === teacherFilter;
        return matchesSearch && matchesTeacher;
      }),
    [courses, searchQuery, teacherFilter]
  );

  const publishedCourses = filteredCourses.filter((c) => c.isPublished);
  const unpublishedCourses = filteredCourses.filter((c) => !c.isPublished);
  const publishedTotalPages = Math.max(
    1,
    Math.ceil(publishedCourses.length / COURSES_PER_PAGE)
  );
  const unpublishedTotalPages = Math.max(
    1,
    Math.ceil(unpublishedCourses.length / COURSES_PER_PAGE)
  );
  const pagedPublishedCourses = publishedCourses.slice(
    (publishedPage - 1) * COURSES_PER_PAGE,
    publishedPage * COURSES_PER_PAGE
  );
  const pagedUnpublishedCourses = unpublishedCourses.slice(
    (unpublishedPage - 1) * COURSES_PER_PAGE,
    unpublishedPage * COURSES_PER_PAGE
  );

  const fetchData = async () => {
    setLoading("fetch");
    setError(null);
    try {
      const [courseRes, teacherRes] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/admin/users?type=teachers"),
      ]);
      const courseJson = await courseRes.json();
      const teacherJson = await teacherRes.json();
      if (!courseRes.ok) throw new Error(courseJson.message || "Failed to fetch courses");
      if (!teacherRes.ok) throw new Error(teacherJson.error || "Failed to fetch teachers");
      setCourses(courseJson.courses || []);
      setTeachers((teacherJson.users || []).map((t: { _id: string; name: string; email: string }) => ({
        _id: String(t._id),
        name: t.name,
        email: t.email,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setPublishedPage(1);
    setUnpublishedPage(1);
  }, [searchQuery, teacherFilter, activeTab]);

  const openCreate = () => {
    setForm(initialForm);
    setCreateOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditingCourseId(course._id);
    setForm({
      name: course.name,
      description: course.description,
      syllabus: course.syllabus || "",
      duration: course.duration || "",
      category: course.category || "",
      level: course.level || "",
      price: String(course.price ?? 0),
      imageUrl: course.imageUrl || "",
      teacherId: String(course.teacher?._id || ""),
    });
    setEditOpen(true);
  };

  const handleCreate = async () => {
    setLoading("create");
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          isPublished: activeTab === "published",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create course");
      setCourses((prev) => [json.course, ...prev]);
      setCreateOpen(false);
      setSuccess("Course created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  const handleUpdate = async () => {
    if (!editingCourseId) return;
    setLoading("update");
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/courses/${editingCourseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update course");
      setCourses((prev) =>
        prev.map((course) => (course._id === editingCourseId ? json.course : course))
      );
      setEditOpen(false);
      setSuccess("Course updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  const handlePublishToggle = async (course: Course) => {
    setLoading(`publish-${course._id}`);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/courses/${course._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !course.isPublished }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to update publish status");
      setCourses((prev) =>
        prev.map((c) => (c._id === course._id ? { ...c, isPublished: !course.isPublished } : c))
      );
      setSuccess(`Course ${course.isPublished ? "unpublished" : "published"} successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingCourseId) return;
    setLoading("delete");
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/courses/${deletingCourseId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete course");
      setCourses((prev) => prev.filter((c) => c._id !== deletingCourseId));
      setDeleteOpen(false);
      setSuccess("Course deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  const CourseGrid = ({ items }: { items: Course[] }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((course) => (
        <Card key={course._id} className="overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-lg line-clamp-1">{course.name}</h3>
              <Badge variant="secondary">₹{course.price}</Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm">By {course.teacher?.name || "Unknown"}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href={`/courses/${course._id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      <span>View Course</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(course)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    <span>Edit Course</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePublishToggle(course)}>
                    {course.isPublished ? (
                      <XCircle className="mr-2 h-4 w-4" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    <span>{course.isPublished ? "Unpublish" : "Publish"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      setDeletingCourseId(course._id);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Course</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Course Management</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/dashboard">Back to Dashboard</Link>
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Course
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input
          placeholder="Search courses by title/description/category/level"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="w-full border rounded-md px-3 py-2 bg-background"
          value={teacherFilter}
          onChange={(e) => setTeacherFilter(e.target.value)}
        >
          <option value="all">All teachers</option>
          {teachers.map((teacher) => (
            <option key={teacher._id} value={teacher._id}>
              {teacher.name}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          onClick={() => {
            setSearchQuery("");
            setTeacherFilter("all");
          }}
        >
          Reset Filters
        </Button>
      </div>

      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="published" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Published ({publishedCourses.length})
          </TabsTrigger>
          <TabsTrigger value="unpublished" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Unpublished ({unpublishedCourses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="published">
          <Card>
            <CardHeader>
              <CardTitle>Published Courses</CardTitle>
              <CardDescription>
                Manage courses that are live on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading === "fetch" ? (
                <p className="text-muted-foreground">Loading courses...</p>
              ) : (
                <CourseGrid items={pagedPublishedCourses} />
              )}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {publishedPage} of {publishedTotalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={publishedPage <= 1}
                    onClick={() => setPublishedPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={publishedPage >= publishedTotalPages}
                    onClick={() =>
                      setPublishedPage((p) => Math.min(publishedTotalPages, p + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unpublished">
          <Card>
            <CardHeader>
              <CardTitle>Unpublished Courses</CardTitle>
              <CardDescription>
                Review and approve courses before they go live
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading === "fetch" ? (
                <p className="text-muted-foreground">Loading courses...</p>
              ) : (
                <CourseGrid items={pagedUnpublishedCourses} />
              )}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {unpublishedPage} of {unpublishedTotalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unpublishedPage <= 1}
                    onClick={() => setUnpublishedPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unpublishedPage >= unpublishedTotalPages}
                    onClick={() =>
                      setUnpublishedPage((p) =>
                        Math.min(unpublishedTotalPages, p + 1)
                      )
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Course</DialogTitle>
            <DialogDescription>Add a new course as admin.</DialogDescription>
          </DialogHeader>
          <CourseForm form={form} setForm={setForm} teachers={teachers} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading === "create"}>
              {loading === "create" ? "Creating..." : "Create Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>Update course details.</DialogDescription>
          </DialogHeader>
          <CourseForm form={form} setForm={setForm} teachers={teachers} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={loading === "update"}>
              {loading === "update" ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the course and related videos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              {loading === "delete" ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CourseForm({
  form,
  setForm,
  teachers,
}: {
  form: {
    name: string;
    description: string;
    syllabus: string;
    duration: string;
    category: string;
    level: string;
    price: string;
    imageUrl: string;
    teacherId: string;
  };
  setForm: (
    value:
      | {
          name: string;
          description: string;
          syllabus: string;
          duration: string;
          category: string;
          level: string;
          price: string;
          imageUrl: string;
          teacherId: string;
        }
      | ((prev: {
          name: string;
          description: string;
          syllabus: string;
          duration: string;
          category: string;
          level: string;
          price: string;
          imageUrl: string;
          teacherId: string;
        }) => {
          name: string;
          description: string;
          syllabus: string;
          duration: string;
          category: string;
          level: string;
          price: string;
          imageUrl: string;
          teacherId: string;
        })
  ) => void;
  teachers: Teacher[];
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Course Name</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label>Syllabus</Label>
        <Textarea
          value={form.syllabus}
          onChange={(e) => setForm((prev) => ({ ...prev, syllabus: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Duration</Label>
          <Input
            value={form.duration}
            onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Price</Label>
          <Input
            type="number"
            value={form.price}
            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Category</Label>
          <Input
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Level</Label>
          <Input
            value={form.level}
            onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Image URL (optional)</Label>
        <Input
          value={form.imageUrl}
          onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label>Teacher</Label>
        <select
          className="w-full border rounded-md px-3 py-2 bg-background"
          value={form.teacherId}
          onChange={(e) => setForm((prev) => ({ ...prev, teacherId: e.target.value }))}
        >
          <option value="">Select teacher</option>
          {teachers.map((teacher) => (
            <option key={teacher._id} value={teacher._id}>
              {teacher.name} ({teacher.email})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
