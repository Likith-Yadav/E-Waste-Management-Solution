import { SignUp as ClerkSignUp } from "@clerk/clerk-react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SignUp() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </button>

        <div className="max-w-md mx-auto">
          <ClerkSignUp 
            appearance={{
              layout: {
                socialButtonsVariant: "iconButton",
                socialButtonsPlacement: "bottom"
              },
              elements: {
                rootBox: "w-full",
                card: "bg-white shadow-lg rounded-xl p-8 border-0",
                headerTitle: "text-2xl font-bold text-gray-900",
                headerSubtitle: "text-gray-600",
                formButtonPrimary: 
                  "bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2 font-medium",
                formFieldInput: 
                  "w-full rounded-lg border-gray-300 focus:border-green-500 focus:ring-green-500",
                footerAction: "text-green-600 hover:text-green-700",
                dividerLine: "bg-gray-200",
                dividerText: "text-gray-500 bg-white",
                socialButtonsBlockButton: 
                  "border border-gray-300 hover:bg-gray-50 rounded-lg",
                socialButtonsBlockButtonText: "text-gray-700",
                formFieldLabel: "text-gray-700 font-medium",
                identityPreviewText: "text-gray-600",
                identityPreviewEditButtonIcon: "text-green-600"
              }
            }}
            routing="path"
            path="/sign-up"
          />
        </div>
      </div>
    </div>
  );
} 