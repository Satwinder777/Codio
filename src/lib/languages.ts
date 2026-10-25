import { SupportedLanguage } from '@/types';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  {
    id: 'typescript',
    name: 'TypeScript',
    extension: '.ts',
    monacoId: 'typescript',
    sampleCode: `// Welcome to Codio (CodeNest) Real-Time Collaborative Editor!
// Share this URL with your teammates to start coding concurrently.

interface Developer {
  name: string;
  role: string;
  skills: string[];
}

const team: Developer[] = [
  {
    name: "Alex",
    role: "Full Stack Engineer",
    skills: ["TypeScript", "Next.js", "CRDTs"]
  }
];

function greetCollaborators(devs: Developer[]): void {
  console.log("⚡ Real-time collaboration active in Codio!");
  devs.forEach(dev => {
    console.log(\`🚀 Welcome \${dev.name} - Ready to build amazing things.\`);
  });
}

greetCollaborators(team);
`,
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    extension: '.js',
    monacoId: 'javascript',
    sampleCode: `// Codio (CodeNest) - Real-time JavaScript Workspace

async function fetchStats() {
  const response = await fetch("https://api.github.com/zen");
  const zen = await response.text();
  console.log("Codio Zen:", zen);
}

fetchStats();
`,
  },
  {
    id: 'python',
    name: 'Python',
    extension: '.py',
    monacoId: 'python',
    sampleCode: `# Codio (CodeNest) - Python Collaborative Workspace
import math

def calculate_primes(n: int) -> list[int]:
    """Sieve of Eratosthenes algorithm"""
    primes = []
    is_prime = [True] * (n + 1)
    for p in range(2, n + 1):
        if is_prime[p]:
            primes.append(p)
            for i in range(p * p, n + 1, p):
                is_prime[i] = False
    return primes

if __name__ == "__main__":
    print("Primes up to 50:", calculate_primes(50))
`,
  },
  {
    id: 'rust',
    name: 'Rust',
    extension: '.rs',
    monacoId: 'rust',
    sampleCode: `// Codio (CodeNest) - Rust Workspace
fn main() {
    let message = "Welcome to Codio Collaborative Environment!";
    println!("{}", message);
    
    let numbers: Vec<i32> = (1..=10).filter(|x| x % 2 == 0).collect();
    println!("Even numbers: {:?}", numbers);
}
`,
  },
  {
    id: 'go',
    name: 'Go',
    extension: '.go',
    monacoId: 'go',
    sampleCode: `package main

import (
	"fmt"
	"time"
)

func worker(id int, ch chan string) {
	time.Sleep(100 * time.Millisecond)
	ch <- fmt.Sprintf("Goroutine %d completed", id)
}

func main() {
	fmt.Println("🚀 Codio Real-time Go Concurrency")
	ch := make(chan string, 3)
	for i := 1; i <= 3; i++ {
		go worker(i, ch)
	}
	for i := 1; i <= 3; i++ {
		fmt.Println(<-ch)
	}
}
`,
  },
  {
    id: 'cpp',
    name: 'C++',
    extension: '.cpp',
    monacoId: 'cpp',
    sampleCode: `#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::cout << "Codio Collaborative C++ Session" << std::endl;
    std::vector<int> data = {10, 20, 30, 40, 50};
    int sum = std::accumulate(data.begin(), data.end(), 0);
    std::cout << "Sum: " << sum << std::endl;
    return 0;
}
`,
  },
  {
    id: 'csharp',
    name: 'C#',
    extension: '.cs',
    monacoId: 'csharp',
    sampleCode: `using System;
using System.Linq;

namespace CodioApp
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Welcome to Codio C# Workspace!");
            var numbers = Enumerable.Range(1, 10).Select(x => x * x);
            Console.WriteLine(string.Join(", ", numbers));
        }
    }
}
`,
  },
  {
    id: 'java',
    name: 'Java',
    extension: '.java',
    monacoId: 'java',
    sampleCode: `import java.util.List;
import java.util.stream.Collectors;

public class CodioDemo {
    public static void main(String[] args) {
        List<String> coders = List.of("Alice", "Bob", "Charlie");
        System.out.println("Codio Real-time Java Editor");
        coders.stream()
              .map(name -> "Hello, " + name + "!")
              .forEach(System.out::println);
    }
}
`,
  },
  {
    id: 'html',
    name: 'HTML',
    extension: '.html',
    monacoId: 'html',
    sampleCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Codio Preview</title>
  <style>
    body { font-family: system-ui; background: #090d16; color: #fff; padding: 2rem; }
    .badge { background: #6366f1; padding: 4px 12px; border-radius: 9999px; }
  </style>
</head>
<body>
  <h1>Codio Collaborative Editor</h1>
  <p><span class="badge">Live</span> Real-time concurrent edits powered by Yjs.</p>
</body>
</html>
`,
  },
  {
    id: 'css',
    name: 'CSS',
    extension: '.css',
    monacoId: 'css',
    sampleCode: `/* Codio Cyberpunk Theme Styles */
:root {
  --neon-cyan: #06b6d4;
  --neon-indigo: #6366f1;
}

.editor-card {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 30px rgba(99, 102, 241, 0.2);
  border-radius: 12px;
}
`,
  },
  {
    id: 'sql',
    name: 'SQL',
    extension: '.sql',
    monacoId: 'sql',
    sampleCode: `-- Codio Query Analysis
SELECT 
  r.id,
  r.title,
  r.visibility,
  COUNT(m.id) AS member_count,
  r.created_at
FROM public.rooms r
LEFT JOIN public.room_members m ON m.room_id = r.id
WHERE r.is_closed = false
GROUP BY r.id, r.title, r.visibility, r.created_at
ORDER BY r.created_at DESC;
`,
  },
  {
    id: 'json',
    name: 'JSON',
    extension: '.json',
    monacoId: 'json',
    sampleCode: `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "project": "Codio (CODENEST)",
  "features": [
    "Yjs CRDT Real-time Sync",
    "Monaco Multi-Language Editor",
    "Supabase Row-Level Security",
    "Multi-Client Peer Presence"
  ],
  "version": "1.0.0"
}
`,
  },
  {
    id: 'markdown',
    name: 'Markdown',
    extension: '.md',
    monacoId: 'markdown',
    sampleCode: `# 🚀 Codio (CODENEST)

A next-generation collaborative code editor for:
- 👥 **Pair Programming**
- 🎓 **Classroom & Live Teaching**
- 💼 **Technical Interviews**
- 🐞 **Real-time Debugging**

## Key Capabilities
1. Zero lag CRDT synchronization with Yjs.
2. Full syntax highlighting and Monaco IDE features.
3. Shareable secure URLs with granular permissions.
`,
  },
  {
    id: 'dart',
    name: 'Dart',
    extension: '.dart',
    monacoId: 'dart',
    sampleCode: `void main() {
  final greeting = 'Hello from Codio in Dart!';
  print(greeting);
  
  final items = [1, 2, 3, 4, 5];
  final doubled = items.map((x) => x * 2).toList();
  print('Doubled: \$doubled');
}
`,
  },
  {
    id: 'swift',
    name: 'Swift',
    extension: '.swift',
    monacoId: 'swift',
    sampleCode: `import Foundation

struct User {
    let id: UUID
    let name: String
}

let developer = User(id: UUID(), name: "Coder")
print("Welcome \\(developer.name) to Codio!")
`,
  },
  {
    id: 'kotlin',
    name: 'Kotlin',
    extension: '.kt',
    monacoId: 'kotlin',
    sampleCode: `fun main() {
    val languages = listOf("Kotlin", "TypeScript", "Rust", "Go")
    println("Codio supports multi-language collaboration:")
    languages.forEach { println(" - $it") }
}
`,
  },
  {
    id: 'php',
    name: 'PHP',
    extension: '.php',
    monacoId: 'php',
    sampleCode: `<?php

namespace Codio;

class CollaborativeSession {
    public function __construct(private string $roomId) {}
    
    public function announce(): void {
        echo "Active Codio session: " . htmlspecialchars($this->roomId) . PHP_EOL;
    }
}

$session = new CollaborativeSession("nest-alpha-99");
$session->announce();
`,
  }
];

export function getLanguageById(id: string): SupportedLanguage {
  const found = SUPPORTED_LANGUAGES.find((lang) => lang.id.toLowerCase() === id.toLowerCase() || lang.monacoId.toLowerCase() === id.toLowerCase());
  return found || SUPPORTED_LANGUAGES[0];
}

export function isSupportedLanguageId(id: string): boolean {
  return SUPPORTED_LANGUAGES.some(
    (lang) => lang.id.toLowerCase() === id.toLowerCase() || lang.monacoId.toLowerCase() === id.toLowerCase()
  );
}
