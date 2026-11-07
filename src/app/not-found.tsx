import type { Metadata } from "next";
import { NOT_FOUND_TITLE, NotFoundContent } from "../ui/not-found-content.tsx";

export const metadata: Metadata = { title: NOT_FOUND_TITLE };

export default function NotFound() {
  return <NotFoundContent />;
}
