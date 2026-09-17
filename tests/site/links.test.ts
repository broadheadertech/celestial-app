import { describe, expect, test } from "vitest";
import { messengerUrl, productUrl, shareLinks } from "../../components/dc/links";

describe("messengerUrl", () => {
  test("derives m.me links from the usual Facebook page link shapes", () => {
    expect(messengerUrl("https://www.facebook.com/DragonsCavePH")).toBe("https://m.me/DragonsCavePH");
    expect(messengerUrl("https://facebook.com/dragons.cave.ph/")).toBe("https://m.me/dragons.cave.ph");
    expect(messengerUrl("https://m.facebook.com/DragonsCavePH?ref=bookmarks")).toBe("https://m.me/DragonsCavePH");
    expect(messengerUrl("https://www.facebook.com/profile.php?id=61550000000000")).toBe("https://m.me/61550000000000");
    expect(messengerUrl("https://www.facebook.com/people/Dragons-Cave/61550000000000/")).toBe("https://m.me/61550000000000");
    expect(messengerUrl("https://www.facebook.com/pages/Dragons-Cave/123456789")).toBe("https://m.me/123456789");
  });

  test("returns null when no chat link can be made", () => {
    expect(messengerUrl(undefined)).toBeNull();
    expect(messengerUrl("")).toBeNull();
    expect(messengerUrl("not a url")).toBeNull();
    expect(messengerUrl("https://instagram.com/dragonscave")).toBeNull();
    expect(messengerUrl("https://notfacebook.com/DragonsCave")).toBeNull();
    expect(messengerUrl("https://www.facebook.com/profile.php")).toBeNull();
  });
});

describe("share links", () => {
  test("always point at the live site's readable URL", () => {
    expect(productUrl({ _id: "abc", slug: "super-red-24cm" })).toBe("https://dc.broadheader.com/specimen/super-red-24cm");
    expect(productUrl({ _id: "abc" })).toBe("https://dc.broadheader.com/specimen-detail?id=abc");
    const links = shareLinks("https://dc.broadheader.com/specimen/x", "Super Red at Dragon's Cave");
    expect(links.facebook).toBe("https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fdc.broadheader.com%2Fspecimen%2Fx");
    expect(decodeURIComponent(links.whatsapp.split("text=")[1])).toBe("Super Red at Dragon's Cave https://dc.broadheader.com/specimen/x");
  });
});
