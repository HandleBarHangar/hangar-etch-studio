import { readUrlParams } from "./lib/device";
import GuestApp from "./guest/GuestApp";
import AdminApp from "./admin/AdminApp";
import GalleryApp from "./gallery/GalleryApp";

// No router: the page is chosen once from the URL (?page=admin | ?page=gallery,
// default guest). Keeps GitHub Pages hosting and printed QR links trivial.
export default function App() {
  const params = readUrlParams();
  if (params.page === "admin") return <AdminApp />;
  if (params.page === "gallery") return <GalleryApp eventSlug={params.eventSlug} />;
  return <GuestApp params={params} />;
}
