"use client";

import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Download, FileCode, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ModelConfigGeneratorProps {
  onGenerate?: (config: string) => void;
}

export function ModelConfigGenerator({ onGenerate }: ModelConfigGeneratorProps) {
  const [framework, setFramework] = useState<string>("sklearn");
  const [modelName, setModelName] = useState("My Model");
  const [modelFile, setModelFile] = useState("");
  const [entryPoint, setEntryPoint] = useState("inference.py");
  const [loadFunction, setLoadFunction] = useState("load_model");
  const [predictFunction, setPredictFunction] = useState("predict");
  const [hasAuxFiles, setHasAuxFiles] = useState(false);
  const [auxFiles, setAuxFiles] = useState("vectorizer.pkl, encoder.pkl");
  const [copied, setCopied] = useState(false);

  const getDefaultModelFile = (fw: string) => {
    const defaults: Record<string, string> = {
      sklearn: "model.pkl",
      pytorch: "model.pt",
      tensorflow: "model.h5",
      onnx: "model.onnx",
      custom: "model.pkl",
    };
    return defaults[fw] || "model.pkl";
  };

  const generateConfig = () => {
    const config = {
      name: modelName,
      version: "1.0.0",
      framework: framework,
      entry_point: entryPoint,
      load: {
        name: loadFunction,
        args: ["model_path"],
      },
      predict: {
        name: predictFunction,
        args: ["data"],
      },
      model_file: modelFile || getDefaultModelFile(framework),
      description: "Model description here",
      author: "Your Name",
      tags: ["classification"],
      ...(hasAuxFiles && {
        auxiliary_files: auxFiles.split(",").map((f) => f.trim()),
      }),
    };

    return JSON.stringify(config, null, 2);
  };

  const handleCopy = () => {
    const config = generateConfig();
    navigator.clipboard.writeText(config);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
    if (onGenerate) onGenerate(config);
  };

  const handleDownload = () => {
    const config = generateConfig();
    const blob = new Blob([config], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "model_config.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded model_config.json");
    if (onGenerate) onGenerate(config);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full">
          <FileCode className="h-4 w-4 mr-2" />
          Generate model_config.json
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate model_config.json</DialogTitle>
          <DialogDescription>
            Create a configuration file that tells us how to load and use your model.
            This file must be included at the root of your ZIP archive.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modelName">Model Name</Label>
                <Input
                  id="modelName"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="My Sentiment Analyzer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="framework">Framework</Label>
                <Select value={framework} onValueChange={setFramework}>
                  <SelectTrigger id="framework">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sklearn">Scikit-learn</SelectItem>
                    <SelectItem value="pytorch">PyTorch</SelectItem>
                    <SelectItem value="tensorflow">TensorFlow</SelectItem>
                    <SelectItem value="onnx">ONNX</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Files */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Files</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryPoint">Entry Point (Python file)</Label>
                <Input
                  id="entryPoint"
                  value={entryPoint}
                  onChange={(e) => setEntryPoint(e.target.value)}
                  placeholder="inference.py"
                />
                <p className="text-xs text-muted-foreground">
                  The Python file containing your load and predict functions
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelFile">Model File</Label>
                <Input
                  id="modelFile"
                  value={modelFile}
                  onChange={(e) => setModelFile(e.target.value)}
                  placeholder={getDefaultModelFile(framework)}
                />
                <p className="text-xs text-muted-foreground">
                  Your trained model file (.pkl, .pt, .h5, etc.)
                </p>
              </div>
            </div>
          </div>

          {/* Functions */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Functions</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loadFunction">Load Function Name</Label>
                <Input
                  id="loadFunction"
                  value={loadFunction}
                  onChange={(e) => setLoadFunction(e.target.value)}
                  placeholder="load_model"
                />
                <p className="text-xs text-muted-foreground">
                  Function that loads your model (receives model_path)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="predictFunction">Predict Function Name</Label>
                <Input
                  id="predictFunction"
                  value={predictFunction}
                  onChange={(e) => setPredictFunction(e.target.value)}
                  placeholder="predict"
                />
                <p className="text-xs text-muted-foreground">
                  Function that makes predictions (receives data)
                </p>
              </div>
            </div>
          </div>

          {/* Auxiliary Files */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auxFiles"
                checked={hasAuxFiles}
                onCheckedChange={(checked) => setHasAuxFiles(checked === true)}
              />
              <Label htmlFor="auxFiles" className="cursor-pointer">
                My model has auxiliary files (vectorizer, encoder, etc.)
              </Label>
            </div>
            {hasAuxFiles && (
              <div className="space-y-2">
                <Label htmlFor="auxFilesList">Auxiliary Files (comma-separated)</Label>
                <Input
                  id="auxFilesList"
                  value={auxFiles}
                  onChange={(e) => setAuxFiles(e.target.value)}
                  placeholder="vectorizer.pkl, encoder.pkl, scaler.pkl"
                />
                <p className="text-xs text-muted-foreground">
                  Other files your model depends on
                </p>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto border">
                {generateConfig()}
              </pre>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleCopy}
              className="flex-1"
              variant="outline"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={handleDownload}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md text-sm border border-blue-200 dark:border-blue-800">
            <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              📝 Next Steps:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200 ml-2">
              <li>Download or copy this configuration</li>
              <li>Save it as <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">model_config.json</code></li>
              <li>Place it at the root of your ZIP archive</li>
              <li>Make sure all referenced files exist in your ZIP</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
