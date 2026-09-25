import { redirect } from "next/navigation";

export default function PickupLocationsRedirect() {
  redirect("/admin/fulfilment");
}
