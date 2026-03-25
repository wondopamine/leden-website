import imageUrlBuilder from "@sanity/image-url";
import { getClient } from "./client";

export function urlFor(source: { asset: { _ref: string } }) {
  return imageUrlBuilder(getClient()).image(source);
}
