import LoadingState from "@/components/LoadingState";

export default function Loading() {
    return <div className="grid min-h-[60vh] place-items-center px-4">
        <LoadingState title="আপনার পড়ার জায়গা খোলা হচ্ছে" detail="একটু অপেক্ষা করুন…" className="w-full max-w-lg"/>
    </div>;
}
