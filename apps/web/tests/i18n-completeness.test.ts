import { describe, it, expect } from "vitest";
import en from "../src/messages/en.json";
import mr from "../src/messages/mr.json";
import hi from "../src/messages/hi.json";

function getLeafKeys(obj: Record<string, any>, prefix = ""): string[] {
  let keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getLeafKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getValueByPath(obj: Record<string, any>, path: string): any {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
}

describe("Multilingual Completeness & Parity Tests", () => {
  const enKeys = getLeafKeys(en).sort();
  const mrKeys = getLeafKeys(mr).sort();
  const hiKeys = getLeafKeys(hi).sort();

  it("should have identical key counts across all three languages", () => {
    expect(mrKeys.length).toBe(enKeys.length);
    expect(hiKeys.length).toBe(enKeys.length);
    expect(enKeys.length).toBeGreaterThan(50);
  });

  it("should have zero missing keys in Marathi dictionary", () => {
    const missingInMr = enKeys.filter((k) => !mrKeys.includes(k));
    const extraInMr = mrKeys.filter((k) => !enKeys.includes(k));

    expect(missingInMr).toEqual([]);
    expect(extraInMr).toEqual([]);
  });

  it("should have zero missing keys in Hindi dictionary", () => {
    const missingInHi = enKeys.filter((k) => !hiKeys.includes(k));
    const extraInHi = hiKeys.filter((k) => !enKeys.includes(k));

    expect(missingInHi).toEqual([]);
    expect(extraInHi).toEqual([]);
  });

  it("should ensure no translation value is an empty string", () => {
    for (const key of enKeys) {
      const enVal = getValueByPath(en, key);
      const mrVal = getValueByPath(mr, key);
      const hiVal = getValueByPath(hi, key);

      expect(typeof enVal).toBe("string");
      expect(enVal.trim().length).toBeGreaterThan(0);

      expect(typeof mrVal).toBe("string");
      expect(mrVal.trim().length).toBeGreaterThan(0);

      expect(typeof hiVal).toBe("string");
      expect(hiVal.trim().length).toBeGreaterThan(0);
    }
  });

  it("should verify mandatory Indian construction terminology matches specification", () => {
    // English -> Marathi / Hindi
    expect(mr.nav.projects).toBe("प्रकल्प");
    expect(hi.nav.projects).toBe("परियोजनाएँ");

    expect(mr.projectType.building).toBe("इमारत");
    expect(hi.projectType.building).toBe("भवन");

    expect(mr.projectType.road).toBe("रस्ता");
    expect(hi.projectType.road).toBe("सड़क");

    expect(mr.common.save).toBe("जतन करा");
    expect(hi.common.save).toBe("सहेजें");

    expect(mr.common.cancel).toBe("रद्द करा");
    expect(hi.common.cancel).toBe("रद्द करें");

    expect(mr.nav.settings).toBe("सेटिंग्ज");
    expect(hi.nav.settings).toBe("सेटिंग्स");

    expect(mr.nav.clients).toBe("ग्राहक");
    expect(hi.nav.clients).toBe("ग्राहक");

    expect(mr.brand.tagline).toBe("मिनटों में पूरा अनुमान।");
    expect(hi.brand.tagline).toBe("मिनटों में पूरा अनुमान।");
  });
});
