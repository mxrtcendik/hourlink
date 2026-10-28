import { Meeting } from "@/components/meeting";
import { DEFAULT_DURATION } from "@/lib/link";

export default function Page() {
  return (
    <Meeting initial={{ instant: null, duration: DEFAULT_DURATION, title: "", zones: [], from: null }} />
  );
}
