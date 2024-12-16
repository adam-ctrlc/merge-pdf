class PDFMerger {
  constructor(uploadElementId, downloadElementId, mergeButtonId) {
    this.uploadElement = document.getElementById(uploadElementId);
    this.downloadElement = document.getElementById(downloadElementId);
    this.mergeButton = document.getElementById(mergeButtonId);
    this.filesListElement = document.getElementById('files-list');
    this.files = [];
    this.init();
  }

  init() {
    this.mergeButton.addEventListener('click', () => this.mergePDFs());
    this.uploadElement.addEventListener('change', () =>
      this.handleFileUpload()
    );

    const dropZone = this.uploadElement.parentElement;
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-green-500');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-green-500');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-green-500');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.addFiles(files);
        this.displayFiles();
      }
    });
  }

  handleFileUpload() {
    const files = this.uploadElement.files;
    this.addFiles(files);
    this.displayFiles();
  }

  addFiles(newFiles) {
    const newFilesArray = Array.from(newFiles);

    newFilesArray.forEach((file) => {
      const existingFileIndex = this.files.findIndex(
        (f) => f.file.name === file.name
      );
      if (existingFileIndex > -1) {
        this.files[existingFileIndex].count += 1;
      } else {
        this.files.push({ file, count: 1 });
      }
    });

    this.displayFiles();
  }

  displayFiles() {
    if (this.files.length === 0) {
      this.filesListElement.innerHTML = `
          <ul class="list-none border border-gray-300 rounded p-4">
            <li>No files uploaded yet. Please upload 2 or more PDFs.</li>
          </ul>`;
      this.updateButtonStates(false);
      return;
    }

    const filesList = this.files
      .map(
        ({ file, count }, index) => `
          <li class="flex items-center justify-between p-2 border-b ${
            index === 0 ? 'border-b-2' : ''
          }">
            <span class="text-gray-700">${file.name} (x${count})</span>
            <div class="flex items-center gap-2">
              <span class="text-gray-500 text-sm">${(file.size / 1024).toFixed(
                2
              )} KB</span>
              <button
                class="text-red-500 hover:text-red-700"
                onclick="pdfMerger.removeFile('${file.name}')"
                aria-label="Delete ${file.name}"
              >
                Delete
              </button>
            </div>
          </li>
        `
      )
      .join('');

    this.filesListElement.innerHTML = `
        <ul class="list-none divide-y ">
          ${filesList}
        </ul>
      `;

    this.updateButtonStates(this.files.length >= 2);
  }

  removeFile(fileName) {
    const fileIndex = this.files.findIndex((f) => f.file.name === fileName);
    if (fileIndex > -1) {
      if (this.files[fileIndex].count > 1) {
        this.files[fileIndex].count -= 1;
      } else {
        this.files.splice(fileIndex, 1);
      }
      this.displayFiles();
    }
  }

  updateButtonStates(isValid) {
    if (isValid) {
      this.mergeButton.disabled = false;
      this.mergeButton.classList.remove('opacity-50', 'cursor-not-allowed');
      this.downloadElement.textContent = "Click 'Merge PDFs' to combine files";
      this.downloadElement.classList.remove('text-red-500', 'border-red-500');
      this.downloadElement.classList.add('text-gray-500', 'border-gray-500');
    } else {
      this.mergeButton.disabled = true;
      this.mergeButton.classList.add('opacity-50', 'cursor-not-allowed');
      this.downloadElement.textContent = 'Input at least 2 PDFs to merge.';
      this.downloadElement.classList.remove('text-gray-500', 'border-gray-500');
      this.downloadElement.classList.add('text-red-500', 'border-red-500');
    }
  }

  async mergePDFs() {
    if (this.files.length < 2) {
      alert('Please upload at least two PDF files.');
      return;
    }

    try {
      this.mergeButton.disabled = true;
      this.mergeButton.textContent = 'Merging...';

      const { PDFDocument } = PDFLib;
      const pdfDoc = await PDFDocument.create();

      for (const { file, count } of this.files) {
        const arrayBuffer = await file.arrayBuffer();
        const loadedPdf = await PDFDocument.load(arrayBuffer);
        const pages = await pdfDoc.copyPages(
          loadedPdf,
          loadedPdf.getPageIndices()
        );
        pages.forEach((page) => {
          for (let i = 0; i < count; i++) {
            pdfDoc.addPage(page);
          }
        });
      }

      const mergedPdfBytes = await pdfDoc.save();
      this.createDownloadLink(mergedPdfBytes);
    } catch (error) {
      console.error('Error merging PDFs:', error);
      alert('An error occurred while merging the PDFs. Please try again.');
    } finally {
      this.mergeButton.disabled = false;
      this.mergeButton.textContent = 'Merge PDFs';
    }
  }

  createDownloadLink(mergedPdfBytes) {
    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    this.downloadElement.href = url;
    this.downloadElement.download = 'merged.pdf';
    this.downloadElement.classList.remove('hidden');
    this.downloadElement.textContent = 'Download Merged PDF';
    this.downloadElement.classList.remove('text-red-500', 'border-red-500');
    this.downloadElement.classList.add(
      'text-green-500',
      'border-green-500',
      'hover:bg-green-50'
    );
  }
}

const pdfMerger = new PDFMerger('dropzone-file', 'download', 'merge');
