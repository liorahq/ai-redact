import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { detectEmails, detectPhoneNumbers, detectSSNs, detectCreditCards } from "../src/detectors/pii";

describe("detectEmails", () => {
  it("detects simple email addresses", () => {
    const results = detectEmails("Contact us at user@example.com for info.");
    assert.equal(results.length, 1);
    assert.equal(results[0].type, "email");
    assert.equal(results[0].category, "pii");
    assert.equal(results[0].message, "Email address detected");
  });

  it("detects multiple emails", () => {
    const results = detectEmails("Send to alice@foo.com and bob@bar.org");
    assert.equal(results.length, 2);
  });

  it("detects emails with subdomains", () => {
    const results = detectEmails("user@mail.sub.example.co.uk");
    assert.equal(results.length, 1);
  });

  it("detects emails with plus addressing", () => {
    const results = detectEmails("user+tag@example.com");
    assert.equal(results.length, 1);
  });

  it("does not match bare domains", () => {
    const results = detectEmails("Visit example.com today");
    assert.equal(results.length, 0);
  });
});

describe("detectPhoneNumbers", () => {
  it("detects US phone numbers with country code", () => {
    const results = detectPhoneNumbers("Call +1 555-123-4567");
    assert.equal(results.length, 1);
    assert.equal(results[0].type, "phone-number");
  });

  it("detects UK phone numbers", () => {
    const results = detectPhoneNumbers("Ring +44 20 7946 0958");
    assert.equal(results.length, 1);
  });

  it("detects phone numbers with parentheses", () => {
    const results = detectPhoneNumbers("+1 (555) 123-4567");
    assert.equal(results.length, 1);
  });

  it("does not match short numbers", () => {
    const results = detectPhoneNumbers("+1 234");
    assert.equal(results.length, 0);
  });
});

describe("detectSSNs", () => {
  it("detects SSN format XXX-XX-XXXX", () => {
    const results = detectSSNs("My SSN is 123-45-6789.");
    assert.equal(results.length, 1);
    assert.equal(results[0].type, "ssn");
    assert.equal(results[0].severity, "high");
  });

  it("detects multiple SSNs", () => {
    const results = detectSSNs("SSNs: 111-22-3333 and 444-55-6666");
    assert.equal(results.length, 2);
  });

  it("does not match non-SSN number patterns", () => {
    const results = detectSSNs("Order 123-456-789 shipped");
    assert.equal(results.length, 0);
  });
});

describe("detectCreditCards", () => {
  it("detects valid Visa card number", () => {
    const results = detectCreditCards("Card: 4111 1111 1111 1111");
    assert.equal(results.length, 1);
    assert.equal(results[0].type, "credit-card");
    assert.equal(results[0].severity, "high");
  });

  it("detects Mastercard", () => {
    const results = detectCreditCards("Card: 5500 0000 0000 0004");
    assert.equal(results.length, 1);
  });

  it("detects Amex", () => {
    const results = detectCreditCards("Amex: 3782 822463 10005");
    assert.equal(results.length, 1);
  });

  it("rejects invalid Luhn numbers", () => {
    const results = detectCreditCards("Not a card: 4111 1111 1111 1112");
    assert.equal(results.length, 0);
  });

  it("rejects numbers that don't match known prefixes", () => {
    const results = detectCreditCards("Random: 1234 5678 9012 3456");
    assert.equal(results.length, 0);
  });
});
