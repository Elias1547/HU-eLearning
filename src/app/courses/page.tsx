import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SortAsc, SortDesc } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import { Course } from "@/models/course";
import { Sale } from "@/models/sales";
import { Suspense } from "react";
import { DebouncedSearchInput } from "@/components/courses/debounced-search-input";
import { CourseCard } from "@/components/courses/course-card";
import { CourseCategoryRail } from "@/components/courses/course-category-rail";

interface Teacher {
  _id: string;
  name: string;
  email: string;
}

interface SaleData {
  _id: string;
  amount: number;
  saleTime: string;
  expiryTime?: string;
  notes?: string;
}

interface CourseType {
  _id: string;
  teacher: Teacher;
  name: string;
  description: string;
  imageUrl?: string;
  category?: string;
  duration: string;
  createdAt: string;
  price: number;
  studentsPurchased?: string[];
}

interface CourseWithEnrollment extends CourseType {
  enrollmentCount: number;
  sale?: SaleData | null;
}

interface CourseTeacher {
  _id: string;
  name: string;
  email: string;
}

interface CourseMapped {
  _id: string;
  teacher: CourseTeacher;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  duration: string;
  createdAt: string;
  price: number;
  studentsPurchased: string[];
}

interface ISale {
  _id: string;
  course: string;
  amount: number;
  saleTime: string;
  expiryTime?: string;
  notes?: string;
}

// Helper to get active sale for a course
function getSaleForCourse(sales: ISale[], courseId: string): SaleData | null {
  const now = new Date();
  const found = sales.find(
    (sale) =>
      sale.course === courseId &&
      new Date(sale.saleTime) <= now &&
      (!sale.expiryTime || new Date(sale.expiryTime) >= now)
  );
  return found
    ? {
        _id: found._id,
        amount: found.amount,
        saleTime: found.saleTime,
        expiryTime: found.expiryTime,
        notes: found.notes,
      }
    : null;
}

// Fetch all courses with sorting and filtering
async function getAllCourses(
  searchQuery?: string | null,
  sortBy = "createdAt",
  sortOrder = "desc"
) {
  await dbConnect();

  try {
    const query: {
      isPublished: boolean;
      $or?: {
        name?: { $regex: string; $options: string };
        description?: { $regex: string; $options: string };
      }[];
    } = { isPublished: true };

    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
      ];
    }

    // Only allow sorting by whitelisted fields
    const allowedSorts = ["createdAt", "price", "name"];
    const sortField = allowedSorts.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortField] = sortDirection;

    const courses = await Course.find(query)
      .populate("teacher", "name email")
      .sort(sortOptions)
      .lean();

    return courses.map(
      (course: CourseType): CourseMapped => ({
        _id: course._id.toString(),
        teacher: {
          _id: course.teacher._id.toString(),
          name: course.teacher.name,
          email: course.teacher.email,
        },
        name: course.name,
        description: course.description,
        imageUrl: course.imageUrl || "",
        category: course.category || "",
        duration: course.duration,
        createdAt: course.createdAt.toString(),
        price: course.price,
        studentsPurchased:
          course.studentsPurchased?.map((id: string) => id.toString()) || [],
      })
    );
  } catch (error) {
    console.error("Error fetching courses:", error);
    return [];
  }
}

// Fetch enrollment count for a course
async function getEnrollmentCount(courseId: string) {
  await dbConnect();
  try {
    const course = (await Course.findById(
      courseId
    ).lean()) as CourseType | null;
    return course ? course.studentsPurchased?.length || 0 : 0;
  } catch (error) {
    console.error(
      `Error getting enrollment count for course ${courseId}:`,
      error
    );
    return 0;
  }
}

// Fetch all active sales for a set of course IDs
async function getActiveSales(courseIds: string[]) {
  await dbConnect();
  try {
    const now = new Date();
    const sales: ISale[] = await Sale.find({
      course: { $in: courseIds },
      saleTime: { $lte: now },
      $or: [{ expiryTime: { $gte: now } }, { expiryTime: null }],
    }).lean();
    return sales.map((sale) => ({
      ...sale,
      course: sale.course.toString(),
      _id: sale._id.toString(),
      saleTime: sale.saleTime?.toString(),
      expiryTime: sale.expiryTime ? sale.expiryTime.toString() : undefined,
      notes: sale.notes,
    }));
  } catch (error) {
    console.error("Error fetching sales:", error);
    return [];
  }
}

export default async function AllCoursesPage({
  searchParams,
}: {
  searchParams: { search?: string; sort?: string; order?: string };
}) {
  const searchQuery = searchParams.search || null;
  const sortBy = searchParams.sort || "createdAt";
  const sortOrder = searchParams.order || "desc";

  // Fetch courses
  const courses = await getAllCourses(searchQuery, sortBy, sortOrder);

  // Fetch enrollment counts and sales for each course
  const courseIds = courses.map((c: CourseType) => c._id);
  const sales = await getActiveSales(courseIds);

  const coursesWithEnrollment: CourseWithEnrollment[] = await Promise.all(
    courses.map(async (course: CourseMapped): Promise<CourseWithEnrollment> => {
      const enrollmentCount: number = await getEnrollmentCount(course._id);
      const sale = getSaleForCourse(sales, course._id);
      return {
        ...course,
        enrollmentCount,
        sale,
      };
    })
  );

  const categoryLabels = coursesWithEnrollment.map((c) => c.category);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm dark:bg-card/50 dark:ring-white/[0.04] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Catalog
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              All courses
            </h1>
            <p className="text-muted-foreground">
              {coursesWithEnrollment.length} published course
              {coursesWithEnrollment.length === 1 ? "" : "s"} available right now.
            </p>
          </div>
          <div className="w-full lg:max-w-md">
            <Suspense fallback={null}>
              <DebouncedSearchInput
                defaultValue={searchQuery || ""}
                sortBy={sortBy}
                sortOrder={sortOrder}
              />
            </Suspense>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { label: "Newest", value: "createdAt" },
            { label: "Price", value: "price" },
            { label: "Name", value: "name" },
          ].map((sort) => (
            <Badge
              key={sort.value}
              variant={sortBy === sort.value ? "default" : "outline"}
              className="cursor-pointer rounded-full px-3 py-1 text-xs font-semibold"
            >
              <Link
                href={`/courses?sort=${sort.value}&order=${
                  sortBy === sort.value && sortOrder === "desc" ? "asc" : "desc"
                }${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`}
                className="flex items-center"
              >
                {sort.label}
                {sortBy === sort.value &&
                  (sortOrder === "desc" ? (
                    <SortDesc className="ml-1 h-3 w-3" />
                  ) : (
                    <SortAsc className="ml-1 h-3 w-3" />
                  ))}
              </Link>
            </Badge>
          ))}
        </div>
      </div>

      <CourseCategoryRail categories={categoryLabels} className="mt-10" />

      {coursesWithEnrollment.length > 0 ? (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {coursesWithEnrollment.map((course) => (
            <CourseCard
              key={course._id}
              id={course._id}
              name={course.name}
              description={course.description}
              imageUrl={course.imageUrl}
              duration={course.duration}
              createdAt={course.createdAt}
              price={course.price}
              enrollmentCount={course.enrollmentCount}
              instructorName={course.teacher.name}
              sale={course.sale}
            />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-dashed border-border/70 bg-card/60 py-16 text-center">
          <h2 className="text-xl font-semibold text-foreground">No courses found</h2>
          {searchQuery ? (
            <p className="text-muted-foreground mb-6">
              No courses match your search criteria. Try different keywords or
              browse all courses.
            </p>
          ) : (
            <p className="text-muted-foreground mb-6">
              No courses are available at the moment. Please check back later.
            </p>
          )}
          {searchQuery && (
            <Link href="/courses">
              <Button>View All Courses</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}