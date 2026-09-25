import { retryAsync } from "../retryAsync";

describe("retryAsync", () => {
  it("returns the result immediately when the operation succeeds on the first try", async () => {
    const fn = jest.fn().mockResolvedValue("ok");

    const result = await retryAsync(fn, { attempts: 3, delayMs: 5, label: "test" });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries after failures and succeeds once the operation recovers", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValueOnce("recovered");

    const result = await retryAsync(fn, { attempts: 5, delayMs: 5, label: "test" });

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws the last error once attempts are exhausted", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("always fails"));

    await expect(retryAsync(fn, { attempts: 3, delayMs: 5, label: "test" })).rejects.toThrow(
      "always fails"
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
