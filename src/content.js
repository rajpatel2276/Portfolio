const GH = 'https://github.com/rajpatel2276'
const HF = 'https://huggingface.co/spaces/Raj2276/bird-classifier-resnet'

export const PROFILE = {
  name: 'Raj Patel',
  role: 'ML Engineer',
  email: 'rajpatel2276@gmail.com',
  github: GH,
  linkedin: 'https://www.linkedin.com/in/rajpatel59',
  resumePath: '/Raj_Patel_resume.pdf',
}

// After you deploy with a custom domain, you can set it here, e.g. 'https://rajpatel.dev'.
// Left empty, the QR uses whatever address the site is being served from.
export const SITE_URL = ''
export const RESUME_URL = (SITE_URL || window.location.origin) + PROFILE.resumePath

export const ROTATING = ['Computer Vision', 'Deep Learning', 'Model Optimization', 'Multimodal RAG']

export const FEATURED = [
  {
    no: '01',
    key: 'shastra',
    title: 'ShastraSetu',
    tag: 'Zero-VRAM multimodal RAG',
    line: 'Containerized zero-VRAM (0 MiB GPU) multimodal RAG and claim verification, with CPU-optimized CLIP and cross-encoder reranking',
    stack: 'CLIP · ONNX Runtime · ms-marco-MiniLM-L-6-v2',
    url: GH + '/ShastraSetu',
  },
  {
    no: '02',
    key: 'traffic',
    title: 'Traffic Video Analytics',
    tag: 'Real-time vehicle tracking',
    line: 'Real-time vehicle tracking at 45 FPS with YOLOv8 and SORT',
    stack: 'YOLOv8 · SORT · CUDA',
    url: GH + '/Car-Counter-YOLOv8',
  },
  {
    no: '03',
    key: 'rag',
    title: 'Offline Multimodal RAG',
    tag: 'Containerized CV architecture',
    line: '100% offline, GPU-accelerated paper Q&A with citations and rendered diagrams',
    stack: 'FastAPI · Qdrant · Llama 3.2 · PyMuPDF',
    url: GH + '/RAG_multimodal_pipeline',
  },
]

export const MORE = [
  { title: 'QAT Vision Engine', url: GH + '/QAT_Vision_Engine' },
  { title: 'Bird Classifier (live demo)', url: HF },
  { title: 'All on GitHub', url: GH },
]

export const SKILL_GROUPS = [
  ['Languages', ['Python', 'C++', 'Java', 'SQL']],
  ['ML Frameworks', ['PyTorch', 'Scikit-Learn', 'YOLO v8/v11', 'TensorFlow', 'ONNX', 'Hugging Face']],
  ['Data & Vision', ['NumPy', 'Pandas', 'Matplotlib', 'OpenCV', 'Librosa', 'SciPy']],
  ['Mathematics', ['Linear Algebra', 'Multivariable Calculus', 'Probability & Statistics', 'Optimization']],
  ['Developer Tools', ['Git', 'Conda', 'Linux', 'CUDA', 'Google Colab']],
]

// words shown on the 3D skill sphere
export const SKILL_SPHERE = [
  'PyTorch', 'TensorFlow', 'YOLO', 'ONNX', 'Hugging Face', 'Scikit-Learn', 'OpenCV',
  'NumPy', 'Pandas', 'SciPy', 'Librosa', 'Matplotlib', 'Python', 'C++', 'Java',
  'SQL', 'CUDA', 'Git', 'Linux', 'Conda',
]