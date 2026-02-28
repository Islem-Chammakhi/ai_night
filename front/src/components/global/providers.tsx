"use client";

import React from 'react';
import { Toaster } from "sonner";
import { JobProvider } from "@/context/JobContext";

interface Props {
    children: React.ReactNode;
}

const Providers = ({ children }: Props) => {
    return (
        <JobProvider>
            <Toaster
                richColors
                theme="dark"
                position="bottom-center"
            />
            {children}
        </JobProvider>
    )
};

export default Providers
