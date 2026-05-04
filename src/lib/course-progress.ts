import mongoose from "mongoose";
import { CourseProgress } from "@/models/course-progress";
import { Video } from "@/models/video";

type ObjectLike = { toString(): string };

type RawVideoProgressEntry = {
  video: ObjectLike | string;
  lastWatchedSeconds?: number;
  durationSeconds?: number;
  watchedPercentage?: number;
  isCompleted?: boolean;
  firstWatchedAt?: Date | string;
  lastWatchedAt?: Date | string;
  completedAt?: Date | string;
};

type RawProgressDocument = {
  completedVideos?: Array<ObjectLike | string>;
  videoProgress?: RawVideoProgressEntry[];
  percentageCompleted?: number;
  totalWatchTimeSeconds?: number;
  lastAccessedVideo?: ObjectLike | string | null;
  startedAt?: Date | string;
  completedAt?: Date | string | null;
  lastActivityAt?: Date | string;
};

type ProgressDocumentInstance = {
  completedVideos: Array<ObjectLike | string>;
  videoProgress: RawVideoProgressEntry[];
  percentageCompleted?: number;
  totalWatchTimeSeconds?: number;
  startedAt?: Date | string;
  completedAt?: Date | string | null;
  lastActivityAt?: Date | string;
  lastAccessedVideo?: ObjectLike | string | null;
  save: () => Promise<void>;
  toObject: () => RawProgressDocument;
};

export interface CourseProgressSnapshot {
  completedVideos: string[];
  completedVideosCount: number;
  totalVideos: number;
  percentageCompleted: number;
  totalWatchTimeSeconds: number;
  lastAccessedVideo?: string;
  startedAt?: string;
  completedAt?: string;
  lastActivityAt?: string;
  videoProgress: Record<
    string,
    {
      lastWatchedSeconds: number;
      durationSeconds: number;
      watchedPercentage: number;
      isCompleted: boolean;
      completedAt?: string;
      lastWatchedAt?: string;
    }
  >;
}

export interface ProgressUpdatePayload {
  studentId: string;
  courseId: string;
  videoId: string;
  currentTimeSeconds: number;
  durationSeconds?: number;
  markCompleted?: boolean;
}

function toIdString(value: ObjectLike | string | undefined | null) {
  if (!value) return "";
  return typeof value === "string" ? value : value.toString();
}

function toIsoString(value: Date | string | undefined | null) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

export function buildProgressSnapshot(
  progressDoc: RawProgressDocument | null | undefined,
  totalVideos: number
): CourseProgressSnapshot {
  const completedVideos =
    progressDoc?.completedVideos?.map((videoId) => toIdString(videoId)).filter(Boolean) ?? [];

  const videoProgressEntries = progressDoc?.videoProgress ?? [];
  const videoProgress = Object.fromEntries(
    videoProgressEntries
      .map((entry) => {
        const videoId = toIdString(entry.video);
        if (!videoId) return null;

        return [
          videoId,
          {
            lastWatchedSeconds: Math.max(0, entry.lastWatchedSeconds ?? 0),
            durationSeconds: Math.max(0, entry.durationSeconds ?? 0),
            watchedPercentage: Math.max(0, Math.min(100, entry.watchedPercentage ?? 0)),
            isCompleted: Boolean(entry.isCompleted),
            completedAt: toIsoString(entry.completedAt),
            lastWatchedAt: toIsoString(entry.lastWatchedAt),
          },
        ];
      })
      .filter((entry): entry is [string, CourseProgressSnapshot["videoProgress"][string]] => Boolean(entry))
  );

  return {
    completedVideos,
    completedVideosCount: completedVideos.length,
    totalVideos,
    percentageCompleted:
      totalVideos > 0
        ? Math.max(0, Math.min(100, progressDoc?.percentageCompleted ?? (completedVideos.length / totalVideos) * 100))
        : 0,
    totalWatchTimeSeconds: Math.max(0, progressDoc?.totalWatchTimeSeconds ?? 0),
    lastAccessedVideo: toIdString(progressDoc?.lastAccessedVideo) || undefined,
    startedAt: toIsoString(progressDoc?.startedAt),
    completedAt: toIsoString(progressDoc?.completedAt),
    lastActivityAt: toIsoString(progressDoc?.lastActivityAt),
    videoProgress,
  };
}

export async function getCourseProgressSnapshot(studentId: string, courseId: string) {
  const [progressDoc, totalVideos] = await Promise.all([
    CourseProgress.findOne({ student: studentId, course: courseId }).lean(),
    Video.countDocuments({ course: courseId }),
  ]);

  return buildProgressSnapshot(progressDoc, totalVideos);
}

export async function updateCourseProgress({
  studentId,
  courseId,
  videoId,
  currentTimeSeconds,
  durationSeconds,
  markCompleted = false,
}: ProgressUpdatePayload) {
  const safeCurrentTime = Math.max(0, currentTimeSeconds || 0);
  const safeDuration = Math.max(durationSeconds ?? 0, safeCurrentTime);
  const watchedPercentage =
    safeDuration > 0 ? Math.min(100, (safeCurrentTime / safeDuration) * 100) : 0;
  const shouldComplete = markCompleted || watchedPercentage >= 90;
  const now = new Date();

  let progressDoc = (await CourseProgress.findOne({
    student: studentId,
    course: courseId,
  })) as ProgressDocumentInstance | null;

  if (!progressDoc) {
    progressDoc = new CourseProgress({
      student: studentId,
      course: courseId,
      completedVideos: [],
      videoProgress: [],
      percentageCompleted: 0,
      totalWatchTimeSeconds: 0,
      startedAt: now,
      lastActivityAt: now,
    });
  }

  const existingEntry = progressDoc.videoProgress.find(
    (entry: RawVideoProgressEntry) => toIdString(entry.video) === videoId
  );

  const previousTime = existingEntry?.lastWatchedSeconds ?? 0;
  const timeDelta = Math.max(0, safeCurrentTime - previousTime);

  if (existingEntry) {
    existingEntry.lastWatchedSeconds = Math.max(existingEntry.lastWatchedSeconds ?? 0, safeCurrentTime);
    existingEntry.durationSeconds = Math.max(existingEntry.durationSeconds ?? 0, safeDuration);
    existingEntry.watchedPercentage = Math.max(existingEntry.watchedPercentage ?? 0, watchedPercentage);
    existingEntry.lastWatchedAt = now;
    if (!existingEntry.firstWatchedAt) {
      existingEntry.firstWatchedAt = now;
    }
    if (shouldComplete) {
      existingEntry.isCompleted = true;
      existingEntry.completedAt = existingEntry.completedAt ?? now;
      existingEntry.watchedPercentage = 100;
    }
  } else {
    progressDoc.videoProgress.push({
      video: videoId,
      lastWatchedSeconds: safeCurrentTime,
      durationSeconds: safeDuration,
      watchedPercentage: shouldComplete ? 100 : watchedPercentage,
      isCompleted: shouldComplete,
      firstWatchedAt: now,
      lastWatchedAt: now,
      completedAt: shouldComplete ? now : undefined,
    });
  }

  if (shouldComplete && !progressDoc.completedVideos.some((id: ObjectLike | string) => toIdString(id) === videoId)) {
    progressDoc.completedVideos.push(videoId);
  }

  progressDoc.lastAccessedVideo = videoId;
  progressDoc.lastActivityAt = now;
  progressDoc.totalWatchTimeSeconds = Math.max(0, (progressDoc.totalWatchTimeSeconds ?? 0) + timeDelta);

  const totalVideos = await Video.countDocuments({ course: courseId });
  progressDoc.percentageCompleted =
    totalVideos > 0 ? (progressDoc.completedVideos.length / totalVideos) * 100 : 0;
  progressDoc.completedAt =
    totalVideos > 0 && progressDoc.completedVideos.length === totalVideos ? progressDoc.completedAt ?? now : undefined;

  await progressDoc.save();

  return buildProgressSnapshot(progressDoc.toObject(), totalVideos);
}

export interface TeacherCourseProgressAnalytics {
  courseId: string;
  enrolledStudents: number;
  startedStudents: number;
  completedStudents: number;
  averageCompletionPercentage: number;
  averageWatchTimeSeconds: number;
}

export async function getTeacherCourseProgressAnalytics(courseIds: string[]) {
  if (courseIds.length === 0) {
    return new Map<string, TeacherCourseProgressAnalytics>();
  }

  const normalizedCourseIds = courseIds.map((courseId) =>
    mongoose.Types.ObjectId.isValid(courseId)
      ? new mongoose.Types.ObjectId(courseId)
      : courseId
  );

  const analytics = (await CourseProgress.aggregate([
    {
      $match: {
        course: { $in: normalizedCourseIds },
      },
    },
    {
      $group: {
        _id: "$course",
        startedStudents: { $sum: 1 },
        completedStudents: {
          $sum: {
            $cond: [{ $gte: ["$percentageCompleted", 100] }, 1, 0],
          },
        },
        averageCompletionPercentage: { $avg: "$percentageCompleted" },
        averageWatchTimeSeconds: { $avg: "$totalWatchTimeSeconds" },
      },
    },
  ])) as Array<{
    _id: ObjectLike | string;
    startedStudents: number;
    completedStudents: number;
    averageCompletionPercentage: number;
    averageWatchTimeSeconds: number;
  }>;

  return new Map(
    analytics.map((entry) => [
      toIdString(entry._id),
      {
        courseId: toIdString(entry._id),
        enrolledStudents: 0,
        startedStudents: entry.startedStudents ?? 0,
        completedStudents: entry.completedStudents ?? 0,
        averageCompletionPercentage: entry.averageCompletionPercentage ?? 0,
        averageWatchTimeSeconds: entry.averageWatchTimeSeconds ?? 0,
      },
    ])
  );
}
