"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import SparklesText from "@/components/ui/sparkles-text";
import ShimmerButton from "@/components/ui/shimmer-button";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import axios from "axios";
import ShineBorder from "@/components/ui/shine-border";
import { MagicCard } from "@/components/ui/magic-card";

interface ImageData {
  url: string;
  description: string;
}

interface PredictResult {
  similarity_score: number;
  bounding_boxes: ImageData[] | null;
  cropped_faces: ImageData[] | null;
  error: string | null;
}

export default function Home() {
  const [image1, setImage1] = useState<File | null>(null);
  const [preview1, setPreview1] = useState<string | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);

  const inputImageRef1 = useRef<HTMLInputElement>(null);
  const inputImageRef2 = useRef<HTMLInputElement>(null);

  const imageRef1 = useRef<HTMLDivElement>(null);
  const imageRef2 = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);

  const boundingBoxRef1 = useRef<HTMLDivElement>(null);
  const boundingBoxRef2 = useRef<HTMLDivElement>(null);

  const croppedFaceRef1 = useRef<HTMLDivElement>(null);
  const croppedFaceRef2 = useRef<HTMLDivElement>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (image1 && image2) {
      setCanSubmit(true);
      setResult(null);
    }
  }, [image1, image2]);

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: React.Dispatch<React.SetStateAction<File | null>>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(file);
        if (event.target?.result) {
          setPreview(event.target.result as string);
        }
      };
      reader.onerror = () => {
        console.error("Failed to read the file.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputImageRef1.current) inputImageRef1.current.value = "";
    if (inputImageRef2.current) inputImageRef2.current.value = "";
    setImage1(null);
    setImage2(null);
    setPreview1(null);
    setPreview2(null);
    setResult(null);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    setIsLoading(true);
    setResult(null);

    e.preventDefault();
    if (image1 && image2) {
      const formData = new FormData();
      formData.append("image1", image1);
      formData.append("image2", image2);

      try {
        const response = await axios.post(
          "http://localhost:8000/predict",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        console.log(response);

        if (response.data.status_code === 400) {
          const { message, similarity_score } = response.data.detail;

          setResult({
            similarity_score: similarity_score || 0,
            error: message,
            bounding_boxes: null,
            cropped_faces: null,
          });
          return;
        }

        if (response.status === 200) {
          const { similarity_score, bounding_boxes, cropped_faces } =
            response.data;

          setResult({
            similarity_score,
            error: null,
            bounding_boxes,
            cropped_faces,
          });
          return;
        } else {
          console.error("Failed to compare images.");
        }
      } catch (error) {
        console.error("Failed to compare images.", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center w-screen p-10"
      ref={containerRef}
    >
      <SparklesText text="Siamese Network Testing" />

      <form
        className="flex flex-col items-center gap-5 mt-10"
        onSubmit={handleSubmit}
      >
        <div className="flex gap-20">
          {/* Image 1 Upload */}
          <div className="space-y-3">
            <label className="block font-medium">Upload Image 1:</label>
            <Input
              ref={inputImageRef1}
              type="file"
              name="image1"
              accept="image/*"
              onChange={(e) => handleImageChange(e, setImage1, setPreview1)}
            />
            {preview1 && (
              <div
                className="mt-2 rounded-lg border border-gray-300 p-2 w-full h-[20rem] flex justify-center items-center"
                ref={imageRef1}
              >
                <Image
                  src={preview1}
                  alt="Preview Image 1"
                  width={300}
                  height={300}
                  className="object-cover max-h-full rounded-md"
                />
              </div>
            )}
          </div>

          {/* Image 2 Upload */}
          <div className="space-y-3">
            <label className="block font-medium">Upload Image 2:</label>
            <Input
              ref={inputImageRef2}
              type="file"
              name="image2"
              accept="image/*"
              onChange={(e) => handleImageChange(e, setImage2, setPreview2)}
            />
            {preview2 && (
              <div
                className="mt-2 rounded-lg border border-gray-300 p-2 w-full h-[20rem] flex justify-center items-center"
                ref={imageRef2}
              >
                <Image
                  src={preview2}
                  alt="Preview Image 2"
                  width={300}
                  height={300}
                  className="object-cover max-h-full rounded-md"
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-20" ref={destinationRef}>
          <ShimmerButton
            className="shadow-2xl"
            disabled={!canSubmit}
            onClick={result ? handleReset : handleSubmit}
          >
            <span className="text-sm font-medium text-white lg:text-lg">
              {result ? "Result" : "Compare Images"}
            </span>
          </ShimmerButton>
          {result && <p>*click to reset</p>}
        </div>
      </form>

      {preview1 && (
        <AnimatedBeam
          duration={10}
          pathWidth={5}
          className="-z-10"
          containerRef={containerRef}
          fromRef={imageRef1}
          reverse={false}
          toRef={destinationRef}
        />
      )}
      {preview2 && (
        <AnimatedBeam
          duration={10}
          pathWidth={5}
          className="-z-10"
          containerRef={containerRef}
          reverse={false}
          fromRef={imageRef2}
          toRef={destinationRef}
        />
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center w-screen p-10">
          <SparklesText text="Processing Images" />
        </div>
      )}

      {!isLoading && result?.error && (
        <div className="mt-20" ref={resultRef}>
          <ShineBorder
            className="relative flex h-[500px] px-10 w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-background md:shadow-xl"
            color={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
          >
            <SparklesText text="Error Processing Images" />
            <p className="text-center mt-5">{result?.error}</p>{" "}
            {result?.similarity_score && (
              <p>Similarity Score: {result?.similarity_score}</p>
            )}
          </ShineBorder>
        </div>
      )}

      {result && !isLoading && result?.error === null && (
        <>
          <div className="w-full flex flex-col justify-center items-center mt-20">
            {result.bounding_boxes && (
              <div className="mt-20 flex gap-10">
                <div ref={boundingBoxRef1}>
                  <MagicCard
                    className="cursor-pointer flex-col items-center justify-center shadow-2xl whitespace-nowrap text-4xl p-3"
                    gradientColor={"#D9D9D955"}
                  >
                    <Image
                      className="rounded-md w-fit h-fit"
                      src={`http://localhost:8000${result.bounding_boxes[0].url}`}
                      alt={result.bounding_boxes[0].description}
                      width={300}
                      height={300}
                    />
                  </MagicCard>
                </div>
                <div ref={boundingBoxRef2}>
                  <MagicCard
                    className="cursor-pointer flex-col items-center justify-center shadow-2xl whitespace-nowrap text-4xl p-3"
                    gradientColor={"#D9D9D955"}
                  >
                    <Image
                      className="rounded-md w-fit h-fit"
                      src={`http://localhost:8000${result.bounding_boxes[1].url}`}
                      alt={result.bounding_boxes[1].description}
                      width={300}
                      height={300}
                    />
                  </MagicCard>
                </div>
              </div>
            )}

            {result.cropped_faces && (
              <div className="mt-20 flex gap-10">
                <div ref={croppedFaceRef1}>
                  <MagicCard
                    className="cursor-pointer flex-col items-center justify-center shadow-2xl whitespace-nowrap text-4xl p-3"
                    gradientColor={"#D9D9D955"}
                  >
                    <Image
                      className="rounded-md w-fit h-fit"
                      src={`http://localhost:8000${result.cropped_faces[0].url}`}
                      alt={result.cropped_faces[0].description}
                      width={160}
                      height={160}
                    />
                  </MagicCard>
                </div>
                <div ref={croppedFaceRef2}>
                  <MagicCard
                    className="cursor-pointer flex-col items-center justify-center shadow-2xl whitespace-nowrap text-4xl p-3"
                    gradientColor={"#D9D9D955"}
                  >
                    <Image
                      className="rounded-md w-fit h-fit"
                      src={`http://localhost:8000${result.cropped_faces[1].url}`}
                      alt={result.cropped_faces[1].description}
                      width={160}
                      height={160}
                    />
                  </MagicCard>
                </div>
              </div>
            )}

            <div className="mt-20" ref={resultRef}>
              <ShineBorder
                className="relative flex h-[500px] px-10 w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-background md:shadow-xl"
                color={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
              >
                <SparklesText
                  text={`Similarity Score: ${(
                    result.similarity_score * 100
                  ).toFixed(2)}%`}
                />
                <p className="text-center mt-5">
                  Gambar kemungkinan wajah dari orang yang SAMA.
                </p>
              </ShineBorder>
            </div>
          </div>

          <AnimatedBeam
            duration={6}
            pathWidth={5}
            className="-z-10"
            containerRef={containerRef}
            reverse={false}
            fromRef={destinationRef}
            toRef={boundingBoxRef1}
          />
          <AnimatedBeam
            duration={6}
            pathWidth={5}
            className="-z-10"
            containerRef={containerRef}
            reverse={false}
            fromRef={destinationRef}
            toRef={boundingBoxRef2}
          />
          <AnimatedBeam
            duration={6}
            pathWidth={5}
            className="-z-10"
            containerRef={containerRef}
            reverse={false}
            fromRef={boundingBoxRef1}
            toRef={croppedFaceRef1}
          />
          <AnimatedBeam
            duration={6}
            pathWidth={5}
            className="-z-10"
            containerRef={containerRef}
            reverse={false}
            fromRef={boundingBoxRef2}
            toRef={croppedFaceRef2}
          />
          {resultRef && (
            <>
              <AnimatedBeam
                duration={6}
                pathWidth={5}
                className="-z-10"
                containerRef={containerRef}
                reverse={false}
                fromRef={croppedFaceRef1 ? croppedFaceRef1 : destinationRef}
                toRef={resultRef}
              />
              <AnimatedBeam
                duration={6}
                pathWidth={5}
                className="-z-10"
                containerRef={containerRef}
                reverse={false}
                fromRef={croppedFaceRef2 ? croppedFaceRef2 : destinationRef}
                toRef={resultRef}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
