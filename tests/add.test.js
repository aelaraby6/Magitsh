const fs = require("fs").promises;
const path = require("path");
const { add } = require("../src/commands/add");
const { init } = require("../src/commands/init");

global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
};

describe("Add Command", () => {
  const testDir = path.join(__dirname, "test-add-repo");
  const mygitPath = path.join(testDir, ".mygit");
  const objectsPath = path.join(mygitPath, "objects");
  const indexPath = path.join(mygitPath, "index.json");

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
    await init();
    console.log.mockClear();
    console.error.mockClear();
  });

  afterEach(async () => {
    process.chdir(__dirname);
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test("should add a single file to staging area", async () => {
    const testFile = "test.txt";
    const content = "Hello, World!";
    await fs.writeFile(testFile, content);

    await add([testFile]);

    // Check index was updated
    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);

    expect(index[testFile]).toBeDefined();
    expect(index[testFile].hash).toBeDefined();
    expect(index[testFile].size).toBe(content.length);
    expect(index[testFile].mtime).toBeDefined();

    // Check success message
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining(`Added ${testFile} to staging area`)
    );
  });

  test("should add multiple files to staging area", async () => {
    const files = ["file1.txt", "file2.txt", "file3.txt"];

    for (const file of files) {
      await fs.writeFile(file, `Content of ${file}`);
    }

    await add(files);

    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);

    for (const file of files) {
      expect(index[file]).toBeDefined();
      expect(index[file].hash).toBeDefined();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`Added ${file} to staging area`)
      );
    }
  });

  test("should create object file with correct hash", async () => {
    const testFile = "hash-test.txt";
    const content = "Test content for hashing";
    await fs.writeFile(testFile, content);

    await add([testFile]);

    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);
    const hash = index[testFile].hash;

    // Check object file exists (Git format: objects/<dir>/<file>)
    const dir = hash.substring(0, 2);
    const file = hash.substring(2);
    const objectFile = path.join(objectsPath, dir, file);
    const exists = await fs
      .access(objectFile)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);

    // Verify content matches (decompress blob object)
    const zlib = require("zlib");
    const compressed = await fs.readFile(objectFile);
    const decompressed = zlib.inflateSync(compressed);
    const nullIndex = decompressed.indexOf(0);
    const storedContent = decompressed.slice(nullIndex + 1).toString("utf-8");
    expect(storedContent).toBe(content);
  });

  test("should update index when file is modified and re-added", async () => {
    const testFile = "modify-test.txt";

    // Add file first time
    await fs.writeFile(testFile, "Original content");
    await add([testFile]);

    const indexData1 = await fs.readFile(indexPath, "utf-8");
    const index1 = JSON.parse(indexData1);
    const originalHash = index1[testFile].hash;

    // Modify and re-add
    await fs.writeFile(testFile, "Modified content with more text");
    await add([testFile]);

    const indexData2 = await fs.readFile(indexPath, "utf-8");
    const index2 = JSON.parse(indexData2);
    const newHash = index2[testFile].hash;

    expect(newHash).not.toBe(originalHash);
    expect(index2[testFile].size).toBeGreaterThan(index1[testFile].size);
  });

  test("should handle non-existent file gracefully", async () => {
    const nonExistentFile = "does-not-exist.txt";

    await add([nonExistentFile]);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(`Error adding file ${nonExistentFile}`)
    );

    // Index should not contain the file
    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);
    expect(index[nonExistentFile]).toBeUndefined();
  });

  test("should add some files even if others fail", async () => {
    const goodFile = "good.txt";
    const badFile = "does-not-exist.txt";

    await fs.writeFile(goodFile, "Good content");

    await add([goodFile, badFile]);

    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);

    // Good file should be added
    expect(index[goodFile]).toBeDefined();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining(`Added ${goodFile} to staging area`)
    );

    // Bad file should error
    expect(index[badFile]).toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(`Error adding file ${badFile}`)
    );
  });

  test("should preserve existing index entries when adding new files", async () => {
    const file1 = "existing.txt";
    const file2 = "new.txt";

    // Add first file
    await fs.writeFile(file1, "Existing file");
    await add([file1]);

    const indexData1 = await fs.readFile(indexPath, "utf-8");
    const index1 = JSON.parse(indexData1);
    const hash1 = index1[file1].hash;

    // Add second file
    await fs.writeFile(file2, "New file");
    await add([file2]);

    const indexData2 = await fs.readFile(indexPath, "utf-8");
    const index2 = JSON.parse(indexData2);

    // Both files should be in index
    expect(index2[file1]).toBeDefined();
    expect(index2[file2]).toBeDefined();
    expect(index2[file1].hash).toBe(hash1);
  });

  test("should handle files in subdirectories", async () => {
    const subdir = "subdir";
    const fileName = "file.txt";
    const filePath = path.join(subdir, fileName);

    await fs.mkdir(subdir, { recursive: true });
    await fs.writeFile(filePath, "Content in subdirectory");

    await add([filePath]);

    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);

    expect(index[filePath]).toBeDefined();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining(`Added ${filePath} to staging area`)
    );
  });

  test("should handle empty files", async () => {
    const emptyFile = "empty.txt";
    await fs.writeFile(emptyFile, "");

    await add([emptyFile]);

    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);

    expect(index[emptyFile]).toBeDefined();
    expect(index[emptyFile].size).toBe(0);
    expect(index[emptyFile].hash).toBeDefined();
  });

  test("should handle binary files", async () => {
    const binaryFile = "binary.bin";
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE]);
    await fs.writeFile(binaryFile, buffer);

    await add([binaryFile]);

    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);

    expect(index[binaryFile]).toBeDefined();
    expect(index[binaryFile].size).toBe(buffer.length);

    // Verify stored object content (Git format: objects/<dir>/<file>)
    const hash = index[binaryFile].hash;
    const dir = hash.substring(0, 2);
    const file = hash.substring(2);
    const objectFile = path.join(objectsPath, dir, file);

    // Decompress blob object
    const zlib = require("zlib");
    const compressed = await fs.readFile(objectFile);
    const decompressed = zlib.inflateSync(compressed);
    const nullIndex = decompressed.indexOf(0);
    const storedContent = decompressed.slice(nullIndex + 1);
    expect(storedContent).toEqual(buffer);
  });

  test("should fail if not in a MyGit repository", async () => {
    // Create a new directory without .mygit
    const nonRepoDir = path.join(__dirname, "non-repo");
    await fs.mkdir(nonRepoDir, { recursive: true });
    process.chdir(nonRepoDir);

    const testFile = "test.txt";
    await fs.writeFile(testFile, "content");

    await add([testFile]);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Error in add command")
    );

    await fs.rm(nonRepoDir, { recursive: true, force: true });
  });

  test("should create objects directory if it doesn't exist", async () => {
    // Remove objects directory
    await fs.rm(objectsPath, { recursive: true, force: true });

    const testFile = "test.txt";
    await fs.writeFile(testFile, "content");

    await add([testFile]);

    // Objects directory should be recreated
    const exists = await fs
      .access(objectsPath)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);

    // File should still be added successfully
    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);
    expect(index[testFile]).toBeDefined();
  });

  test("should handle files with special characters in names", async () => {
    const specialFile = "file with spaces & special-chars.txt";
    await fs.writeFile(specialFile, "Special content");

    await add([specialFile]);

    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);

    expect(index[specialFile]).toBeDefined();
  });

  test("should store metadata correctly", async () => {
    const testFile = "metadata-test.txt";
    const content = "Test metadata";
    await fs.writeFile(testFile, content);

    const stat = await fs.stat(testFile);

    await add([testFile]);

    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);

    expect(index[testFile].size).toBe(stat.size);
    expect(index[testFile].mtime).toBe(stat.mtimeMs);
    expect(typeof index[testFile].hash).toBe("string");
    expect(index[testFile].hash.length).toBe(40); // SHA-1 hash length
  });

  test("should add all files when using '.'", async () => {
    // Create multiple files
    await fs.writeFile("file1.txt", "content1");
    await fs.writeFile("file2.txt", "content2");
    await fs.writeFile("file3.txt", "content3");

    await add(["."]);

    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);

    expect(index["file1.txt"]).toBeDefined();
    expect(index["file2.txt"]).toBeDefined();
    expect(index["file3.txt"]).toBeDefined();
    expect(Object.keys(index).length).toBe(3);
  });

  test("should add all files in subdirectories when using '.'", async () => {
    await fs.mkdir("subdir", { recursive: true });
    await fs.writeFile("root.txt", "root content");
    await fs.writeFile(path.join("subdir", "nested.txt"), "nested content");

    await add(["."]);

    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);

    expect(index["root.txt"]).toBeDefined();
    expect(index[path.join("subdir", "nested.txt")]).toBeDefined();
    expect(Object.keys(index).length).toBe(2);
  });

  test("should exclude .mygit and node_modules when using '.'", async () => {
    await fs.mkdir("node_modules", { recursive: true });
    await fs.writeFile("file.txt", "content");
    await fs.writeFile(path.join("node_modules", "package.json"), "{}");

    await add(["."]);

    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);

    expect(index["file.txt"]).toBeDefined();
    expect(index[path.join("node_modules", "package.json")]).toBeUndefined();
    expect(Object.keys(index).length).toBe(1);
  });

  test("should show message when no files to add with '.'", async () => {
    // No files created, only .mygit exists
    await add(["."]);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("No files to add")
    );
  });

  test("should handle mix of '.' and specific files", async () => {
    await fs.writeFile("file1.txt", "content1");
    await fs.writeFile("file2.txt", "content2");

    // Add all files with '.'
    await add(["."]);

    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);

    expect(index["file1.txt"]).toBeDefined();
    expect(index["file2.txt"]).toBeDefined();
  });

  test("should add deeply nested files with '.'", async () => {
    await fs.mkdir(path.join("level1", "level2", "level3"), { recursive: true });
    await fs.writeFile(path.join("level1", "file1.txt"), "l1");
    await fs.writeFile(path.join("level1", "level2", "file2.txt"), "l2");
    await fs.writeFile(path.join("level1", "level2", "level3", "file3.txt"), "l3");

    await add(["."]);

    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);

    expect(index[path.join("level1", "file1.txt")]).toBeDefined();
    expect(index[path.join("level1", "level2", "file2.txt")]).toBeDefined();
    expect(index[path.join("level1", "level2", "level3", "file3.txt")]).toBeDefined();
    expect(Object.keys(index).length).toBe(3);
  });
});
