// Chip presets. Every figure is copied from the vendor page named in `src` (checked 16 Nov 2026).
// `rows` hold DENSE peak rates (TOPS or TFLOPS, i.e. 2 x MacTOPS) by input bit length.
// Where a vendor prints only a "with sparsity" figure, the dense value is half of it, matching the
// dense/sparse pairs the same vendor prints elsewhere; that step is recorded in `derived`.
// dieMm2: area of logic dies on a non-planar process; null where the vendor does not publish it.
// dramBw: GB/s, per chip. null where not published or not relevant.

export const CHIPS = [
  {
    id: 'h100', name: 'NVIDIA H100 SXM', vendor: 'NVIDIA', datacenter: true,
    rows: [
      { label: 'FP8 Tensor', bits: 8, tops: 1979 },
      { label: 'FP16 Tensor', bits: 16, tops: 989.5 },
      { label: 'INT8 Tensor', bits: 8, tops: 1979 },
    ],
    dieMm2: 814, dramBw: 3350,
    derived: 'NVIDIA lists 3,958 TFLOPS FP8 and 1,979 TFLOPS FP16 "with sparsity"; dense values are half.',
    src: [
      { label: 'NVIDIA H100 product page (specs)', url: 'https://www.nvidia.com/en-us/data-center/h100/' },
      { label: 'NVIDIA Hopper architecture in depth (GH100 die 814 mm²)', url: 'https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/' },
    ],
  },
  {
    id: 'h200', name: 'NVIDIA H200 SXM', vendor: 'NVIDIA', datacenter: true,
    rows: [
      { label: 'FP8 Tensor', bits: 8, tops: 1979 },
      { label: 'FP16 Tensor', bits: 16, tops: 989.5 },
    ],
    dieMm2: null, dramBw: 4800,
    derived: 'NVIDIA lists 3,958 TFLOPS FP8 "with sparsity"; dense is half. NVIDIA does not state the H200 die area on this page; TPP alone decides its paragraph.',
    note: 'The January 2026 rule names the H200 as an example of a chip under the 21,000 TPP / 6,500 GB/s line.',
    src: [{ label: 'NVIDIA H200 product page (specs)', url: 'https://www.nvidia.com/en-us/data-center/h200/' }],
  },
  {
    id: 'h20', name: 'NVIDIA H20', vendor: 'NVIDIA', datacenter: true, override: 'h20',
    rows: [], dieMm2: null, dramBw: null,
    note: 'NVIDIA publishes no H20 datasheet figures. Its China license requirement came from a direct U.S. government notice disclosed in NVIDIA\'s 15 April 2025 Form 8-K.',
    src: [{ label: 'NVIDIA Form 8-K, 15 Apr 2025', url: 'https://www.sec.gov/Archives/edgar/data/1045810/000104581025000082/nvda-20250409.htm' }],
  },
  {
    id: 'a100', name: 'NVIDIA A100 80GB SXM', vendor: 'NVIDIA', datacenter: true,
    rows: [
      { label: 'FP16 Tensor', bits: 16, tops: 312 },
      { label: 'INT8 Tensor', bits: 8, tops: 624 },
    ],
    dieMm2: 826, dramBw: 2039,
    derived: 'NVIDIA prints dense | sparse pairs (312 | 624 TFLOPS FP16; 624 | 1,248 TOPS INT8).',
    src: [
      { label: 'NVIDIA A100 product page (specs)', url: 'https://www.nvidia.com/en-us/data-center/a100/' },
      { label: 'NVIDIA Ampere architecture in depth (GA100 die 826 mm²)', url: 'https://developer.nvidia.com/blog/nvidia-ampere-architecture-in-depth/' },
    ],
  },
  {
    id: 'b200', name: 'NVIDIA B200 (one GPU of DGX B200)', vendor: 'NVIDIA', datacenter: true,
    rows: [{ label: 'FP4 Tensor', bits: 4, tops: 9000 }],
    dieMm2: null, dramBw: 8000,
    derived: 'DGX B200 (8 GPUs) lists FP4 144 PFLOPS sparse | 72 PFLOPS dense and 64 TB/s HBM3e; per GPU that is 9,000 TFLOPS dense FP4 and 8,000 GB/s. The FP8 line on that page is not marked dense or sparse, so it is not used.',
    src: [{ label: 'NVIDIA DGX B200 product page (specs)', url: 'https://www.nvidia.com/en-us/data-center/dgx-b200/' }],
  },
  {
    id: 'mi325x', name: 'AMD Instinct MI325X', vendor: 'AMD', datacenter: true,
    rows: [
      { label: 'FP8', bits: 8, tops: 2614.9 },
      { label: 'FP16', bits: 16, tops: 1307.4 },
    ],
    dieMm2: null, dramBw: 6000,
    derived: 'AMD lists FP8 2.61 PFLOPS (5.22 with structured sparsity) and 2614.9 TFLOPS FP8 / 1307.4 FP16 in its comparison table; peak memory bandwidth 6 TB/s.',
    note: 'The January 2026 rule names the MI325X alongside the H200.',
    src: [{ label: 'AMD Instinct MI325X product page', url: 'https://www.amd.com/en/products/accelerators/instinct/mi300/mi325x.html' }],
  },
  {
    id: 'rtx4090', name: 'NVIDIA GeForce RTX 4090 (gaming)', vendor: 'NVIDIA', datacenter: false,
    rows: [
      { label: 'FP8 Tensor (FP16 acc.)', bits: 8, tops: 660.6 },
      { label: 'INT8 Tensor', bits: 8, tops: 660.6 },
      { label: 'INT4 Tensor', bits: 4, tops: 1321.2 },
      { label: 'FP16 Tensor (FP16 acc.)', bits: 16, tops: 330.3 },
    ],
    dieMm2: 608.5, dramBw: null,
    derived: 'Ada whitepaper, Appendix A, prints dense/sparse pairs; dense values used. AD102 die 608.5 mm².',
    src: [{ label: 'NVIDIA Ada GPU architecture whitepaper (PDF)', url: 'https://images.nvidia.com/aem-dam/Solutions/geforce/ada/nvidia-ada-gpu-architecture.pdf' }],
  },
  {
    id: 'rtx4080', name: 'NVIDIA GeForce RTX 4080 16GB (gaming)', vendor: 'NVIDIA', datacenter: false,
    rows: [
      { label: 'INT8 Tensor', bits: 8, tops: 389.9 },
      { label: 'INT4 Tensor', bits: 4, tops: 779.8 },
      { label: 'FP16 Tensor (FP16 acc.)', bits: 16, tops: 194.9 },
    ],
    dieMm2: 378.6, dramBw: null,
    derived: 'Ada whitepaper, Appendix B, dense values. AD103 die 378.6 mm².',
    src: [{ label: 'NVIDIA Ada GPU architecture whitepaper (PDF)', url: 'https://images.nvidia.com/aem-dam/Solutions/geforce/ada/nvidia-ada-gpu-architecture.pdf' }],
  },
  {
    id: 'ascend910', name: 'Huawei Ascend 910 (2019)', vendor: 'Huawei', datacenter: true, designerD5: true,
    rows: [
      { label: 'FP16', bits: 16, tops: 256 },
      { label: 'INT8', bits: 8, tops: 512 },
    ],
    dieMm2: null, dramBw: null,
    derived: 'Huawei press release: 256 TFLOPS FP16, 512 TOPS INT8, 310 W. Huawei publishes no die area, so performance density is unknown.',
    src: [{ label: 'Huawei press release, 23 Aug 2019 (Wayback Machine copy)', url: 'https://web.archive.org/web/20190823175812/https://www.huawei.com/en/press-events/news/2019/8/huawei-ascend-910-most-powerful-ai-processor' }],
  },
  {
    id: 'ascend910bcd', name: 'Huawei Ascend 910B / 910C / 910D', vendor: 'Huawei', datacenter: true, designerD5: true, override: 'prc3a090',
    rows: [], dieMm2: null, dramBw: null,
    note: 'No official specifications. BIS guidance names these parts as PRC 3A090 ICs.',
    src: [{ label: 'BIS guidance on GP10 and PRC advanced-computing ICs, 13 May 2025', url: 'https://www.bis.gov/media/1575' }],
  },
];
