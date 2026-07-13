import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";
import { SaleTimer, SalePriceBlock } from "@/components/courses/course-sales";

export type CourseCardSale = {
  _id: string;
  amount: number;
  saleTime: string;
  expiryTime?: string;
  notes?: string;
} | null;

export type CourseCardProps = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  duration: string;
  createdAt: string;
  price: number;
  enrollmentCount: number;
  instructorName: string;
  sale: CourseCardSale;
};

const PLACEHOLDER = "/course-placeholder.svg";

function courseImageSrc(imageUrl: string) {
  if (imageUrl && imageUrl.trim()) return imageUrl;
  return PLACEHOLDER;
}

export function CourseCard({
  id,
  name,
  description,
  imageUrl,
  duration,
  createdAt,
  price,
  enrollmentCount,
  instructorName,
  sale,
}: CourseCardProps) {
  const src = courseImageSrc(imageUrl);
  const isLocalPlaceholder = src === PLACEHOLDER;

  return (
    <Card className="group/card relative flex h-full flex-col overflow-hidden border-border/70 bg-card shadow-sm ring-1 ring-black/[0.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-primary/15 dark:ring-white/[0.06] dark:hover:ring-primary/25">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted sm:aspect-video">
        <Image
          src={src}
          alt={name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.04]"
          priority={false}
          unoptimized={isLocalPlaceholder}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80 transition-opacity duration-300 group-hover/card:opacity-90" />
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2">
          <Badge className="border-0 bg-background/90 text-foreground shadow-sm backdrop-blur-sm">
            {enrollmentCount} enrolled
          </Badge>
        </div>
      </div>

      <CardHeader className="space-y-2 pb-2">
        <CardTitle className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
          {name}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground/90">{instructorName}</span>
          <span className="text-muted-foreground"> · Instructor</span>
        </p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full text-xs font-medium">
            <Clock className="mr-1 h-3 w-3 opacity-70" aria-hidden />
            {duration}
          </Badge>
          <Badge variant="outline" className="rounded-full text-xs font-medium">
            <Calendar className="mr-1 h-3 w-3 opacity-70" aria-hidden />
            {new Date(createdAt).toLocaleDateString()}
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/20 py-4">
        <div className="text-lg font-semibold tabular-nums text-foreground">
          {sale ? (
            <>
              <SalePriceBlock sale={sale} price={price} />
              <SaleTimer expiryTime={sale.expiryTime} />
            </>
          ) : price === 0 ? (
            <span className="text-primary">Free</span>
          ) : (
            `₹${price}`
          )}
        </div>
        <Link href={`/courses/${id}`} className="shrink-0">
          <Button className="font-semibold shadow-sm transition-transform duration-200 hover:scale-[1.02]">
            View course
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
