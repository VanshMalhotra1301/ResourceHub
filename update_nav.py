import os

files = [
    ("Binary Search", "dsa-binary-search.html"),
    ("Bubble Sort", "dsa-bubble-sort.html"),
    ("Selection Sort", "dsa-selection-sort.html"),
    ("Insertion Sort", "dsa-insertion-sort.html"),
    ("Merge Sort", "dsa-merge-sort.html"),
    ("Quick Sort", "dsa-quick-sort.html"),
    ("Radix Sort", "dsa-radix-sort.html"),
    ("Bucket Sort", "dsa-bucket-sort.html"),
    ("Greedy Knapsack", "dsa-greedy-knapsack.html"),
    ("Huffman Coding", "dsa-huffman.html"),
]

style = """
    <style>
        /* ── Navigation Footer ── */
        .algo-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background: rgba(7, 7, 16, 0.85);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 24px;
            z-index: 1000;
        }
        .nav-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #94a3b8;
            text-decoration: none;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s;
            padding: 8px 16px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .nav-btn:hover {
            color: #e2e8f0;
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.1);
        }
        .nav-btn.disabled {
            opacity: 0.3;
            pointer-events: none;
            cursor: not-allowed;
        }
        .nav-center {
            display: flex;
            align-items: center;
            gap: 6px;
            color: #22d3ee;
            text-decoration: none;
            font-size: 14px;
            font-weight: 700;
            font-family: 'Space Grotesk', sans-serif;
            transition: all 0.2s;
        }
        .nav-center:hover {
            filter: brightness(1.2);
            text-shadow: 0 0 10px rgba(34, 211, 238, 0.4);
        }
        body { padding-bottom: 70px !important; }
        @media (max-width: 600px) {
            .algo-nav { padding: 10px 12px; }
            .nav-btn { padding: 6px 10px; font-size: 11px; }
            .nav-center { font-size: 12px; }
            .nav-btn span.lbl-txt { display: none; }
        }
    </style>
"""

base_dir = r"c:\Users\vansh\OneDrive - BENNETT UNIVERSITY\Desktop\insane idea\ResourceHub"

for i, (name, filename) in enumerate(files):
    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
        print(f"Skipping {filename}")
        continue
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    prev_link = '<a href="#" class="nav-btn disabled"><i class="ph-bold ph-arrow-left"></i> <span class="lbl-txt">Prev</span></a>'
    if i > 0:
        p_name, p_file = files[i-1]
        prev_link = f'<a href="{p_file}" class="nav-btn"><i class="ph-bold ph-arrow-left"></i> <span class="lbl-txt">{p_name}</span></a>'
        
    next_link = '<a href="#" class="nav-btn disabled"><span class="lbl-txt">Next</span> <i class="ph-bold ph-arrow-right"></i></a>'
    if i < len(files) - 1:
        n_name, n_file = files[i+1]
        next_link = f'<a href="{n_file}" class="nav-btn"><span class="lbl-txt">{n_name}</span> <i class="ph-bold ph-arrow-right"></i></a>'

    nav_html = f"""
    <nav class="algo-nav">
        {prev_link}
        <a href="visual-dsa.html" class="nav-center">⚡ <span class="lbl-txt">All Algorithms</span></a>
        {next_link}
    </nav>
    """
    
    replacement = style + nav_html + "\n</body>"
    
    if '<nav class="algo-nav">' in content:
        print(f"Already updated {filename}")
        continue
        
    content = content.replace("</body>", replacement)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated all files")
