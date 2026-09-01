import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isCodeValid } from "./isCodeValid.ts";

Deno.test("richtiger Code", () => { assertEquals(isCodeValid("geheim", "geheim"), true); });
Deno.test("falscher Code", () => { assertEquals(isCodeValid("falsch", "geheim"), false); });
Deno.test("leerer Code abgelehnt", () => { assertEquals(isCodeValid("", "geheim"), false); });
Deno.test("kein Secret gesetzt -> abgelehnt", () => { assertEquals(isCodeValid("x", ""), false); });
