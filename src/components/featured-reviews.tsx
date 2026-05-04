import { unstable_cache } from "next/cache";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StarIcon, BookOpen } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import { Review } from "@/models/review";

interface ReviewData {
  _id: string;
  rating: number;
  comment: string;
  student: {
    _id: string;
    name: string;
  };
  course: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

interface ReviewAggregate {
  _id: { toString(): string };
  rating: number;
  comment: string;
  student: {
    _id: { toString(): string };
    name: string;
  };
  course: {
    _id: { toString(): string };
    name: string;
  };
  createdAt: Date | string;
}

const getFeaturedReviews = unstable_cache(
  async (): Promise<ReviewData[]> => {
    await dbConnect();

    const reviews = (await Review.aggregate([
      { $match: { rating: { $gte: 4 } } },
      { $sample: { size: 3 } },
      {
        $lookup: {
          from: "students",
          localField: "student",
          foreignField: "_id",
          as: "student",
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$student" },
      { $unwind: "$course" },
      {
        $project: {
          _id: 1,
          rating: 1,
          comment: 1,
          createdAt: 1,
          "student._id": 1,
          "student.name": 1,
          "course._id": 1,
          "course.name": 1,
        },
      },
    ])) as ReviewAggregate[];

    return reviews.map((review) => ({
      _id: review._id.toString(),
      rating: review.rating,
      comment: review.comment,
      student: {
        _id: review.student._id.toString(),
        name: review.student.name,
      },
      course: {
        _id: review.course._id.toString(),
        name: review.course.name,
      },
      createdAt: new Date(review.createdAt).toISOString(),
    }));
  },
  ["featured-reviews"],
  { revalidate: 300 }
);

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          className={`h-4 w-4 ${
            star <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

export async function FeaturedReviews() {
  const reviews = await getFeaturedReviews();

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No reviews available at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {reviews.map((review) => (
        <Card key={review._id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-10 h-10">
                <AvatarFallback>
                  {review.student.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium text-sm">{review.student.name}</h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpen className="h-3 w-3" />
                  <span>{review.course.name}</span>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <StarRating value={review.rating} />
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {review.comment}
            </p>

            <div className="mt-3 text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
