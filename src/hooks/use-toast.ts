"use client";

import { useToast as useToastPrimitive, toast as toastPrimitive } from "@/components/ui/use-toast"

/**
 * Wrapper hook so you can import toast from "@/hooks/use-toast"
 * Keeps your project clean and scalable
 */
export const useToast = () => {
  return useToastPrimitive()
}

export const toast = toastPrimitive
